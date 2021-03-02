"use strict";

// thanks chrome!
let webExtension;
if (typeof browser !== "undefined") {
    webExtension = browser;
} else if (typeof chrome !== "undefined"){
    webExtension = chrome;
} else {
    console.error("What kind of browser do you have anyway? (can't get WebExtension handle)");
}

// OPTIONS loaded from options.js
// STYLES loaded from styles.js

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

// cache of the current options
let optionShadow;

// cache of last seen date of the post
let lastSeenDate;

// bunch of metadata
let preloads;

// cache of comment ids to exact comment time
let commentIdToDate = {};

// whether to keep reacting to changes
let observeChanges = true;



// Page related utilities

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

// calls the option handling function for the given option value
function doOptionChange(key, value) {
    if (key in OPTIONS && OPTIONS[key].onValueChange) {
        debug(`Processing option change for ${key}`);
        OPTIONS[key].onValueChange(value, false);
    }
}

// processes local storage changes, and calls the appropriate option handling function if an option
// was changed
function processStorageChange(changes, namespace) {
    if (namespace === "local") {
        if (changes.options) {
            for (let key in changes.options.newValue) {
                // ew, but I don't really want to implement isEqual for dicts
                let newValueString = JSON.stringify(changes.options.newValue[key]);
                let oldValueString = JSON.stringify(optionShadow[key]);
                if (newValueString !== oldValueString) {
                    debug(`Got change for ${key}, ${JSON.stringify(changes.options.oldValue[key])} -> ${JSON.stringify(changes.options.newValue[key])}`);
                    optionShadow[key] = changes.options.newValue[key];
                    doOptionChange(key, changes.options.newValue[key]);
                }
            }
        }
    }
}



// Individual comment processing

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

function processAllComments() {
    processChildComments($("#main"));
}

// processes to apply to all comments and children in a given dom element
function processChildComments(node) {
    let commentHandlerObjects = [];

    for (let option in OPTIONS) {
        if (OPTIONS[option].onCommentChange && optionShadow[option]) {
            commentHandlerObjects.push(OPTIONS[option]);
        }
    }

    if (commentHandlerObjects.length > 0) {
        $(node).find("div.comment").addBack("div.comment").each(function() {
            for (let object of commentHandlerObjects) {
                object.onCommentChange(this);
            }
        });
    }

    $(node).find(".comment-list-collapser").addBack(".comment-list-collapser").each(function() {
        addCustomCollapser(this);
    });
}



// Processing page mutations

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
        if (!optionShadow.dynamicLoad) {
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
                processChildComments(node);
            }
        }
    } else {
        // do nothing
    }

    // call mutation handlers
    let mutationHandlerObjects = [];

    for (let option in OPTIONS) {
        if (OPTIONS[option].onMutation && optionShadow[option]) {
            mutationHandlerObjects.push(OPTIONS[option]);
        }
    }

    if (mutationHandlerObjects.length > 0) {
        for (let object of mutationHandlerObjects) {
            object.onMutation(mutation);
        }
    }
}



// Setup before page load

// load the initial values of the options and do any necessary config for them
async function loadInitialOptionValues() {
    optionShadow = await getLocalState(OPTION_KEY);
    if (!optionShadow) {
        optionShadow = {};
    }

    for (let key in OPTIONS) {
        let value = optionShadow[key];
        if (value === undefined) {
            // the option hasn't been set in local storage, set it to the default
            value = OPTIONS[key].default;
            optionShadow[key] = value;
        }

        if (OPTIONS[key].onStart) {
            OPTIONS[key].onStart();
        }

        if (OPTIONS[key].onValueChange) {
            OPTIONS[key].onValueChange(value, true);
        }

        if (OPTIONS[key].onLoad) {
            $(document).ready(function() {
                OPTIONS[key].onLoad();
            });
        }
    }

    webExtension.storage.local.set({[OPTION_KEY]: optionShadow});
}

// load the values of the last seen dates of posts
async function loadInitialPostSeenDate() {
    let postSeenDates = await getLocalState(SEEN_DATES_KEY);
    if (!postSeenDates) {
        postSeenDates = {};
    }

    // get previous last seen date, or start of epoch if it doesn't exist
    let postName = getPostName();
    lastSeenDate = new Date(postSeenDates[postName] || 0);

    // update last seen date to now
    postSeenDates[postName] = new Date().toISOString();
    webExtension.storage.local.set({[SEEN_DATES_KEY]: postSeenDates});
}

// called when the extension is first loaded
async function preloadSetup() {
    await loadInitialOptionValues();
    await loadInitialPostSeenDate();
    webExtension.storage.onChanged.addListener(processStorageChange);
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
    processAllComments();
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

// reacts to key presses
function addKeyListener() {
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

            event.preventDefault();

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
                index = mod(index, comments.length);
                if (atEntry(comments[index])) {
                    index--;
                }
            } else {
                index = max;
                index = mod(index, comments.length);
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

// called when the DOM is loaded
async function setup() {
    if (getPageType() === PageTypeEnum.post) {
        await processPreloads();
    }

    addDomObserver();
    addKeyListener();
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
