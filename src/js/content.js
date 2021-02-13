"use strict";

// thanks chrome!
let webExtension;
if (typeof browser !== "undefined") {
    webExtension = browser;
} else if (typeof chrome !== "undefined"){
    webExtension = chrome;
} else {
    console.error("What kind of browser do you have anyway? (can't get WebExtension handle)")
}

// OPTIONS loaded from options.js
// STYLES loaded from styles.js

OPTIONS.fixHeader.toggleFunc = fixHeaderOption;
OPTIONS.hideHearts.toggleFunc = hideHeartsOption;
OPTIONS.showFullDate.toggleFunc = showFullDateOption;
OPTIONS.use24Hour.toggleFunc = use24HourOption;
OPTIONS.highlightNew.toggleFunc = highlightNewOption;
OPTIONS.addParentLinks.toggleFunc = addParentLinksOption;
OPTIONS.applyCommentStyling.toggleFunc = applyCommentStylingOption;
OPTIONS.useOldStyling.toggleFunc = useOldStylingOption;
OPTIONS.loadAll.toggleFunc = loadAllOption;
OPTIONS.hideNew.toggleFunc = hideNewOption;
OPTIONS.resetData.toggleFunc = resetDataOption;

const PageTypeEnum = Object.freeze({
    "main": "main",
    "post": "post",
    "unknown": "unknown",
});

const KeyCommandEnum = Object.freeze({
    "prevComment": "prevComment",
    "nextComment": "nextComment",
    "prevUnread": "prevUnread",
    "nextUnread": "nextUnread",
    "unknown": "unknown",
});

const LOCAL_DATA_KEY = "acx-seen-comments";

// cache of the current options
let optionShadow = {};

// bunch of metadata
let preloads;

// cache of comment ids to exact comment time
let commentIdToDate = {};

// data from local storage
// {
//     "<post name>": {
//         "lastViewedDate": "<date>",
//         "seenComments": [<comment id>, ...],
//     },
//     ...
// }
let localStorageData;

// a set of the seen comments, for optimized lookup
let seenCommentsSet;

// timer for writing new seen comments to local storage
let localStorageTimer = null;

// whether to keep reacting to changes
let observeChanges = true;



// Utilities

// why is js so terrible?
function mod(a, b) {
    return ((a % b) + b) % b;
}

function getUrl(url, data={}) {
    let getPromise = new Promise(function(resolve, reject) {
        $.get(url, data, function(items) {
            resolve(items);
        });
    });
    return getPromise;
}

async function getPostData() {
    let url = `https://astralcodexten.substack.com/api/v1/posts/${getPostName()}`;
    let data = await getUrl(url);
    return JSON.parse(data);
}

async function getPostComments() {
    let postData = await getPostData();
    let postId = postData.id;
    let url = `https://astralcodexten.substack.com/api/v1/post/${postId}/comments?token=&all_comments=true`;
    let data = await getUrl(url);
    return JSON.parse(data).comments;
}

// the URL of the page without any hashes or params
function baseUrl() {
    return window.location.origin + window.location.pathname;
}

function getPageType() {
    if (window.location.pathname.match(/\/p\/[^/]+/)) {
        return PageTypeEnum.post;
    } else {
        return PageTypeEnum.main;
    }
}

function getPostName() {
    let match = window.location.pathname.match(/\/p\/([^/]+)/);
    if (match) {
        return match[1];
    }
    return null;
}

function getLocalState(storageId) {
    let storagePromise = new Promise(function(resolve, reject) {
        webExtension.storage.local.get(storageId, function(items) {
            resolve(items);
        });
    });

    return storagePromise;
}

function getCommentId(comment) {
    return $(comment).children().first().attr("id");
}

function getCommentIdNumber(comment) {
    let idString = getCommentId(comment);
    let idRegexMatch = idString.match(/comment-(\d+)/);

    if (!idRegexMatch) {
        console.error(`Bad comment id found: ${idString}`);
        return;
    }

    return parseInt(idRegexMatch[1]);
}



// Dealing with option changes

function fixHeaderOption(value) {
    $("#fixHeader-css").prop("disabled", !value);
}

function hideHeartsOption(value) {
    $("#hideHearts-css").prop("disabled", !value);
}

function showFullDateOption(value) {
    $("#showFullDate-css").prop("disabled", !value);
}

function use24HourOption(value) {
    $("#use24Hour-css").prop("disabled", !value);
}

function highlightNewOption(value) {
    if (value) {
        $(document.documentElement).addClass("highlight-new");
    } else {
        $(document.documentElement).removeClass("highlight-new");
    }
}

function addParentLinksOption(value) {
    $("#addParentLinks-css").prop("disabled", value);
}

function applyCommentStylingOption(value) {
    $("#applyCommentStyling-css").prop("disabled", !value);
}

function useOldStylingOption(value) {
    $("#useOldStyling-css").prop("disabled", !value);
}

function loadAllOption(value) {
    // this is ugliness incarnate, but what else are ya gonna do with substack?
    function recursiveExpand() {
        let expandButtons = $("button.collapsed-reply");
        if (expandButtons.length) {
            expandButtons.click();
            setTimeout(recursiveExpand, 500);
        }
    }

    if (value) {
        recursiveExpand();
    } else {
        // nothing to do once the page is loaded
    }
}

function hideNewOption(value) {
    $("#hideNew-css").prop("disabled", !value);
}

function resetDataOption(value) {
    if (value) {
        // clear site local storage
        window.localStorage.clear();
        loadLocalStorage();

        // reset options to defaults
        for (let key in OPTIONS) {
            webExtension.storage.local.set({[key]: OPTIONS[key].default});
        }
    }
}

// calls the appropriate option handling function for a given option value
function doOptionChange(key, value, docReady=false) {
    if (key in OPTIONS && OPTIONS[key].toggleFunc) {
        OPTIONS[key].toggleFunc(value);
        if (OPTIONS[key].reprocessCommentsOnChange && docReady) {
            processAllComments($("#main"));
        }
    }
}

// processes local storage changes, and calls the appropriate option handling function if an option
// was changed
function processStorageChange(changes, namespace) {
    if (namespace === "local") {
        for (let key in changes) {
            // update option shadow
            optionShadow[key] = changes[key].newValue;

            doOptionChange(key, changes[key].newValue, true);
        }
    }
}



// Dealing with saving to local storage

// update the local storage with our cached version
function saveLocalStorage() {
    window.localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(localStorageData));
    localStorageTimer = null;
}

// starts or resets a timer that saves any new local storage data when it expires
// needed so that we don't have to save on every single comment load
function startSaveTimer() {
    if (localStorageTimer) {
        clearTimeout(localStorageTimer);
    }

    localStorageTimer = setTimeout(saveLocalStorage, 500);
}



// Individual comment processing

function getLocalDateString(date) {
    let months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    let year = date.getFullYear();
    let month = months[date.getMonth()];
    let day = date.getDate();
    let hour = date.getHours();
    let minute = date.getMinutes().toString().padStart(2, "0");

    let amPm = hour <= 11 ? "am" : "pm";
    let hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);

    let hour12Html = `<span class="hour12-time">${hour12}:${minute} ${amPm}</span>`;
    let hour24Html = `<span class="hour24-time">${hour}:${minute}</span>`;

    return `${month} ${day}, ${year} at ${hour12Html}${hour24Html}`;
}

function addDateString(comment) {
    let commentId = getCommentIdNumber(comment);
    let dateSpan = $(comment).find("> .comment-content .comment-meta > span:nth-child(2)");

    // don't add if the new date element already exists
    if (dateSpan.find(".better-date").length !== 0) {
        return;
    }

    let newDateDisplay = dateSpan.children(":first").clone();
    newDateDisplay.addClass("better-date");
    dateSpan.append(newDateDisplay);

    if (commentId in commentIdToDate) {
        let utcTime = commentIdToDate[commentId];
        let date = new Date(utcTime);
        newDateDisplay.html(getLocalDateString(date));
    }
}

function ensurePostEntry() {
    let postName = getPostName();
    if (!(postName in localStorageData)) {
        localStorageData[postName] = {
            "lastViewedDate": new Date().toISOString(),
            "seenComments": [],
        }
    }
}

function addNewSeenComment(commentId) {
    seenCommentsSet.add(commentId);
    ensurePostEntry();
    let postName = getPostName();
    localStorageData[postName]["seenComments"].push(commentId);
}

function processSeenStatus(comment) {
    let commentId = getCommentIdNumber(comment);
    if (!seenCommentsSet.has(commentId)) {
        addNewSeenComment(commentId);
        startSaveTimer();
        $(comment).addClass("new-comment");
        let dateSpan = $(comment).find("> .comment-content .comment-meta > span:nth-child(2)");
        let newTag = ("<span class='new-tag'></span>");
        dateSpan.append(newTag);
    }
}

function processCommentParagraph(innerHtml) {
    let italicRegex = /(^|\s|\(|\[|\{|\*)\*((?=[^*\s]).*?(?<=[^*\s]))\*/g;
    let blockQuoteRegex = /^(>|&gt;)\s*(.*)$/;
    // yes I'm parsing html with a regex. deal with it
    let linkRegex = /\[(.+?)\]\(<a href="(.*?)".*?<\/a>\)/g;

    function processBlockquotes(text) {
        let reMatch = text.match(blockQuoteRegex);
        if (reMatch) {
            return `<blockquote>${processBlockquotes(reMatch[2])}</blockquote>`;
        } else {
            return text;
        }
    }

    let newHtml = innerHtml;
    newHtml = newHtml.replace(italicRegex, "$1<i>$2</i>");
    newHtml = processBlockquotes(newHtml);
    newHtml = newHtml.replace(linkRegex, `<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>`);

    return newHtml;
}

function processCommentContent(comment) {
    let commentBody = $(comment).find("> .comment-content .comment-body");
    $(commentBody).find("p span").each(function() {
        // only process the text once
        if ($(this).siblings().length === 0) {
            let newText = processCommentParagraph($(this).html());
            let newSpan = `<span class="new-style">${newText}</span>`;
            $(this).parent().append(newSpan);
        }
    });
}

function addCustomCollapser(collapser) {
    collapser = $(collapser);

    if (collapser.parent().children(".custom-collapser").length > 0) {
        return;
    }

    collapser.css("display", "none");
    let commentList = collapser.parent();

    let newCollapser = $(`
        <div class="comment-list-collapser custom-collapser">
            <div class="comment-list-collapser-line"></div>
        </div>`);
    $(commentList).prepend(newCollapser);

    newCollapser.click(function() {
        let parentComment = $(this).closest(".comment");
        let rect = parentComment.find("> .comment-content")[0].getBoundingClientRect();

        // if you can't see the bottom of the parent comment, scroll up
        if (rect.bottom <= 0 || rect.bottom >= window.innerHeight) {
            let anchor = parentComment.children().first();
            anchor[0].scrollIntoView({ "behavior": "smooth" });
        }

        collapser.click();
        newCollapser.remove();
    });
}

// processes to apply to all comments and children in a given dom element
function processAllComments(node) {
    $(node).find("div.comment").addBack("div.comment").each(function() {
        if (optionShadow.showFullDate) {
            addDateString(this);
        }

        processSeenStatus(this);

        if (optionShadow.applyCommentStyling) {
            processCommentContent(this);
        }
    });

    $(node).find(".comment-list-collapser").addBack(".comment-list-collapser").each(function() {
        addCustomCollapser(this);
    });
}



// First processing of different page types

function processMainPage() {
    // nothing to do
}

function updatePostReadDate() {
    let postName = getPostName();
    ensurePostEntry(postName);
    localStorageData[postName]["lastViewedDate"] = new Date().toISOString();
    startSaveTimer();
}

async function processPostPage() {
    updatePostReadDate();

    // oh god oh god
    setTimeout(function() {
        loadAllOption(optionShadow.loadAll);
    }, 2000);
}

function processNewPageType() {
    switch (getPageType()) {
        case PageTypeEnum.main:
            processMainPage();
            break;
        case PageTypeEnum.post:
            processPostPage();
            break;
        default:
            console.error(`Unknown page type: ${getPageType()}`);
    }
}

function processMutation(mutation) {
    if (!observeChanges) {
        return;
    }

    function nodeHasClass(node, classList) {
        for (let c of classList) {
            if (node.classList.contains(c)) {
                return true;
            }
        }

        return false;
    }

    // is this a hack? even the wisest cannot tell
    if (mutation.target.id === "main" ||
            mutation.target.classList.contains("single-post") &&
            mutation.addedNodes[0].tagName.toLowerCase() === "article") {
        // we switched to a different page with pushState
        if (optionShadow.dynamicLoad) {
            processNewPageType();
        } else {
            // don't react to any more updates
            observeChanges = false;

            // force refresh
            window.location.href = window.location.href;
        }
    } else if (nodeHasClass(mutation.target, ["comment", "comment-list", "comment-list-items", "container"])) {
        // check for comments
        for (let i = 0; i < mutation.addedNodes.length; i++) {
            let node = mutation.addedNodes[i];
            if (nodeHasClass(node, ["comment", "comment-list", "comment-list-items", "comment-list-collapser"])) {
                processAllComments(node);
            }
        }
    } else {
        // no nothing
    }
}



// Setup before page load

// adds styles for all the features, which can be disabled later
function addStyles() {
    for (let key in STYLES) {
        let css = STYLES[key];

        let style = $("<style>", {
            id: `${key}-css`,
            html: css,
        });

        $(document.documentElement).append(style);
    }
}

// load the initial values of the options and do any necessary config for them
async function loadInitialOptionValues() {
    // process options in order of priority (highest first)
    let keys = Object.keys(OPTIONS);
    keys.sort((a, b) => OPTIONS[b].priority - OPTIONS[a].priority);

    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let storageValue = await getLocalState(key);
        let value = storageValue[key];
        if (value === undefined) {
            // the option hasn't been set in local storage, set it to the default
            value = OPTIONS[key].default;
            webExtension.storage.local.set({[key]: value});
        }

        if (OPTIONS[key].runTime === "start") {
            doOptionChange(key, value);
        } else if (OPTIONS[key].runTime === "end") {
            $(document).ready(function() {
                doOptionChange(key, value);
            });
        } else if (OPTIONS[key].runTime === "never") {
            // do nothing
        } else {
            console.error("Bad run time found: " + OPTIONS[key].runTime);
        }

        // update the option shadow
        optionShadow[key] = value;
    }
}

function loadLocalStorage() {
    let dataString = window.localStorage.getItem(LOCAL_DATA_KEY);
    if (!dataString) {
        dataString = "{}";
    }
    localStorageData = JSON.parse(dataString);
    let postName = getPostName();
    seenCommentsSet = new Set(
        localStorageData[postName] ? localStorageData[postName]["seenComments"] : []);
}

async function preloadSetup() {
    addStyles();
    await loadInitialOptionValues();
    webExtension.storage.onChanged.addListener(processStorageChange);
    loadLocalStorage();
}



// Initial setup on first page load

// get data stored in window._preloads
function getPreloads() {
    // hacky self-message-sending as content scripts can't access the same window variable as the
    // embedding page

    // unique handshake to ensure we only talk to ourselves
    let handshake = Math.random().toString();
    let inject = $("<script>", {
        html: `window.postMessage({ handshake: "${handshake}", preloads: window._preloads }, "*");`,
    });
    $("head").append(inject);
    inject.remove();

    return new Promise(function(resolve, reject) {
        window.addEventListener("message", function(event) {
            if (event.source === window && event.data.handshake === handshake) {
                preloads = event.data.preloads;
                resolve();
            }
        }, false);
    });
}

// create cache of comment id -> date
function createPreloadCache() {
    function getDateRecursive(comment) {
        let id = comment.id;
        let date = comment.date;
        commentIdToDate[id] = date;

        for (let i = 0; i < comment.children.length; i++) {
            getDateRecursive(comment.children[i]);
        }
    }

    if (!preloads.comments) {
        console.log("Could not find _preloads.comments");
        return;
    }

    for (let i = 0; i < preloads.comments.length; i++) {
        getDateRecursive(preloads.comments[i]);
    }
}

async function processPreloads() {
    await getPreloads();
    createPreloadCache();
    processAllComments($("#main"));
}

function addDomObserver() {
    let observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                processMutation(mutation);
            }
        });
    });

    let container = $("#entry")[0];
    observer.observe(container, {childList: true, subtree: true});
}

// add reaction to clicking on parent comment link
function addParentClickListener() {
    $("#entry").on("click", ".comment-actions > span:nth-child(2)", function() {
        let comment = $(this).closest(".comment");
        let parentComment = $(comment).parent().closest(".comment");
        let scrollElement;
        if (parentComment.length === 0) {
            // already at top level comment
            scrollElement = $(".comments-page");
        } else {
            scrollElement = parentComment.find("> .comment-anchor:first-child");
        }
        scrollElement[0].scrollIntoView({ "behavior": "smooth" });
    });
}

function addNextCommentListener() {
    document.addEventListener("keydown", function(event) {
        let source = event.target;
        let exclude = ["input", "textarea"];

        // don't trigger if people are writing comments
        if (exclude.indexOf(source.tagName.toLowerCase()) !== -1) {
            return;
        }

        if (!optionShadow.allowKeyboardShortcuts) {
            return;
        }

        function getKeyCommand(event) {
            if (isMatchingKeyEvent(optionShadow.prevCommentKey, event)) {
                return KeyCommandEnum.prevComment;
            } else if (isMatchingKeyEvent(optionShadow.nextCommentKey, event)) {
                return KeyCommandEnum.nextComment;
            } else if (isMatchingKeyEvent(optionShadow.prevUnreadKey, event)) {
                return KeyCommandEnum.prevUnread;
            } else if (isMatchingKeyEvent(optionShadow.nextUnreadKey, event)) {
                return KeyCommandEnum.nextUnread;
            } else {
                return KeyCommandEnum.unknown;
            }
        }

        let command = getKeyCommand(event);

        if ([KeyCommandEnum.prevComment, KeyCommandEnum.nextComment,
                KeyCommandEnum.prevUnread, KeyCommandEnum.nextUnread].includes(command)) {

            function inView(element) {
                // scrolling isn't pixel perfect, so include some buffer room
                return element.getBoundingClientRect().top > 0;
            }

            function atEntry(element) {
                // scrolling isn't pixel perfect, so include some buffer room
                return Math.abs(element.getBoundingClientRect().top) < 3;
            }

            let comments;
            if (command === KeyCommandEnum.prevComment || command === KeyCommandEnum.nextComment) {
                comments = $("#main").find(".comment-content");
            } else {
                comments = $("#main").find(".new-comment");
            }

            if (comments.length === 0) {
                return;
            }

            let min = -1;
            let max = comments.length;

            while (max - min > 1) {
                let mid = Math.floor((min + max) / 2);
                if (inView(comments[mid])) {
                    max = mid;
                } else {
                    min = mid;
                }
            }

            let index;
            if (command === KeyCommandEnum.prevComment || command === KeyCommandEnum.prevUnread) {
                index = min;
            } else {
                index = max;
                if (atEntry(comments[index])) {
                    index++;
                }
            }

            // wrap around at the top and bottom
            index = mod(index, comments.length);

            let scrollBehavior = optionShadow.smoothScroll ? "smooth" : "auto";
            comments[index].scrollIntoView({"behavior": scrollBehavior});
        }
    });
}

async function setup() {
    if (getPageType() === PageTypeEnum.post) {
        processPreloads();
    }

    addDomObserver();
    processNewPageType();
    addParentClickListener();
    addNextCommentListener();
}



// actually do the things

async function doAllSetup() {
    await preloadSetup();
    $(document).ready(setup);
}

doAllSetup();



// unit tests

let logTesting = false;

function assertEqual(expected, actual) {
    if (logTesting) {
        console.log(`expected "${expected}", got "${actual}`);
    }

    if (expected !== actual) {
        console.error(`expected "${expected}", got "${actual}"`);
        console.trace();
    }
}

function testCommentStyling() {
    function testItalics() {
        let testCases = {
            "*test*": "<i>test</i>",
            "**test**": "*<i>test</i>*",
            "*two* at *once*": "<i>two</i> at <i>once</i>",
            "******": "******",
            "**": "**",
            "*test many words*": "<i>test many words</i>",
            "(*test*)": "(<i>test</i>)",
            "[*test*]": "[<i>test</i>]",
            "{*test*}": "{<i>test</i>}",
            "This is 1*1 and 2*2": "This is 1*1 and 2*2",
            "A different equation is 3 * 3 and 4 * 4": "A different equation is 3 * 3 and 4 * 4",
            "*a*": "<i>a</i>",
            "*ab*": "<i>ab</i>",
            "*abc*": "<i>abc</i>",
            "Here *there are* *many* different *words*": "Here <i>there are</i> <i>many</i> different <i>words</i>",
            "How about some *punctuation*?": "How about some <i>punctuation</i>?",
        };

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = processCommentParagraph(testCase);
            assertEqual(expected, actual);
        }
    }

    function testBlockquotes() {
        let testCases = {
            "> Basic case": "<blockquote>Basic case</blockquote>",
            ">No space": "<blockquote>No space</blockquote>",
            "Not a > case": "Not a > case",
            "&gt; Basic case": "<blockquote>Basic case</blockquote>",
            "&gt;No space": "<blockquote>No space</blockquote>",
            "&gt;   &gt;  Nested": "<blockquote><blockquote>Nested</blockquote></blockquote>",
            "Not a &gt; case": "Not a &gt; case",
        };

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = processCommentParagraph(testCase);
            assertEqual(expected, actual);
        }
    }

    function testLink() {
        let testCases = {
            '[Basic link](<a href="test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">test.com</a>)':
                '<a href="test.com" target="_blank" rel="noreferrer noopener">Basic link</a>',
            'some text [Basic link](<a href="test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">test.com</a>) after':
                'some text <a href="test.com" target="_blank" rel="noreferrer noopener">Basic link</a> after',
            'two [links](<a href="test.com" class="linkified" target="_?">test.com</a>) at [once](<a href="example.com" class="linkified" target="_blank" >test.com</a>)':
                'two <a href="test.com" target="_blank" rel="noreferrer noopener">links</a> at <a href="example.com" target="_blank" rel="noreferrer noopener">once</a>',
            '[Full url](<a href="https://www.test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">https://www.test.com</a>)':
                '<a href="https://www.test.com" target="_blank" rel="noreferrer noopener">Full url</a>',
            '[Wî()rd ch[cter{}s&gt;](<a href="https://www.test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">https://www.test.com</a>)':
                '<a href="https://www.test.com" target="_blank" rel="noreferrer noopener">Wî()rd ch[cter{}s&gt;</a>',
            '(Bad format)[<a href="https://www.test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">test.com</a>]':
                '(Bad format)[<a href="https://www.test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">test.com</a>]',
            '[just brackets]': '[just brackets]',
            '[just parens]': '[just parens]',
        };

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = processCommentParagraph(testCase);
            assertEqual(expected, actual);
        }
    }

    testItalics();
    testBlockquotes();
    testLink();
}

function doTests() {
    console.log("Running tests");
    testCommentStyling();
}

// doTests();
