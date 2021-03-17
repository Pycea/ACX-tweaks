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
    "parent": "parent",
    "unknown": "unknown",
});

// cache of the current options
let optionShadow;

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

// bunch of metadata
let preloads;

// cache of comment ids to exact comment time
let commentIdToDate = {};

// timer for writing new seen comments to local storage
let localStorageTimer = null;

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



// Dealing with option changes

function setOption(key, value) {
    optionShadow[key] = value;
    webExtension.storage.local.set({[OPTION_KEY]: optionShadow});
}

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
            let changedKeys = [];

            for (let key in changes.options.newValue) {
                // ew, but I don't really want to implement isEqual for dicts
                let newValueString = JSON.stringify(changes.options.newValue[key]);
                let oldValueString = JSON.stringify(optionShadow[key]);

                if (newValueString !== oldValueString) {
                    debug(`Got change for ${key}, ${JSON.stringify(changes.options.oldValue[key])} -> ${JSON.stringify(changes.options.newValue[key])}`);
                    optionShadow[key] = changes.options.newValue[key];
                    changedKeys.push(key);
                }
            }

            for (let key of changedKeys) {
                doOptionChange(key, changes.options.newValue[key]);
            }
        }
    }
}



// Individual comment processing

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
    ensurePostEntry();
    let postName = getPostName();
    localStorageData[postName]["seenComments"].push(commentId);
}

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
        if (OPTIONS[option].onCommentChange && (optionShadow[option]) || OPTIONS[option].alwaysProcessComments) {
            commentHandlerObjects.push(OPTIONS[option]);
        }
    }

    if (commentHandlerObjects.length > 0) {
        $(node).find("div.comment").addBack("div.comment").each(function() {
            for (let object of commentHandlerObjects) {
                object.onCommentChange(this);
            }

            let commentId = getCommentIdNumber(this);
            addNewSeenComment(commentId);
            startSaveTimer();
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
        if (optionShadow.dynamicLoad) {
            for (let key in OPTIONS) {
                if (OPTIONS[key].onLoad) {
                    $(document).ready(function() {
                        OPTIONS[key].onLoad();
                    });
                }

                processAllComments();
            }
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
            if (nodeHasClass(node, ["comment", "comment-list", "comment-list-container", "comment-list-items", "comment-list-collapser"])) {
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

// called when the extension is first loaded
async function preloadSetup() {
    await loadInitialOptionValues();
    await loadLocalStorage();
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

function updatePostReadDate() {
    let postName = getPostName();
    ensurePostEntry(postName);
    localStorageData[postName]["lastViewedDate"] = new Date().toISOString();
    startSaveTimer();
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
            } else if (isMatchingKeyEvent(optionShadow.parentKey, event)) {
                return KeyCommandEnum.parent;
            } else {
                return KeyCommandEnum.unknown;
            }
        }

        let command = getKeyCommand(event);

        if ([KeyCommandEnum.prevComment, KeyCommandEnum.nextComment,
                KeyCommandEnum.prevUnread, KeyCommandEnum.nextUnread,
                KeyCommandEnum.parent].includes(command)) {

            event.preventDefault();

            function inView(element) {
                return element.getBoundingClientRect().top > -5;
            }

            function atEntry(element) {
                // scrolling isn't pixel perfect, so include some buffer room
                return Math.abs(element.getBoundingClientRect().top) < 5;
            }

            let comments;
            if ([KeyCommandEnum.prevComment, KeyCommandEnum.nextComment, KeyCommandEnum.parent].includes(command)) {
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
            } else if (command === KeyCommandEnum.nextComment || command === KeyCommandEnum.nextUnread) {
                index = max;
                index = mod(index, comments.length);
                if (atEntry(comments[index])) {
                    index++;
                }
            } else if (command === KeyCommandEnum.parent) {
                index = max;
                if (index < 0 || index >= comments.length) {
                    return;
                }

                let parent = $(comments[index]).parent().parent().closest(".comment");
                if (parent.length === 0) {
                    return;
                }

                let scrollBehavior = optionShadow.smoothScroll ? "smooth" : "auto";
                parent[0].scrollIntoView({"behavior": scrollBehavior});
                return;
            }

            // wrap around at the top and bottom
            index = mod(index, comments.length);

            let scrollBehavior = optionShadow.smoothScroll ? "smooth" : "auto";
            comments[index].scrollIntoView({"behavior": scrollBehavior});
        }
    });
}

async function checkForUpdates() {
    if (optionShadow.hideUpdateNotice) {
        return;
    }

    let manifest = webExtension.runtime.getManifest();
    let currentVersion = manifest.version;
    let updateData = await getVersionInfo();
    let latestRequiredVersion = updateData.latest_required;

    if (!validateVersion(currentVersion)) {
        console.error(`Bad current version found: ${currentVersion}`);
        return;
    }

    if (!validateVersion(latestRequiredVersion)) {
        console.error(`Bad required version found: ${latestRequiredVersion}`);
        return;
    }

    if (compareVersion(currentVersion, latestRequiredVersion) >= 0) {
        return;
    }

    let updateUrl;
    if (typeof browser !== "undefined") {
        updateUrl = "https://addons.mozilla.org/en-US/firefox/addon/acx-tweaks/";
    } else if (typeof chrome !== "undefined"){
        updateUrl = "https://chrome.google.com/webstore/detail/acx-tweaks/jdpghojhfigbpoeiadalafcmohaekglf";
    } else {
        console.error("Can't get update url.");
    }

    let iconSvg = webExtension.extension.getURL("icons/caret-right-solid.svg");

    let moreText = `You are on version ${currentVersion}. Without the latest version, ${latestRequiredVersion}, some stuff on the page might break.`;
    if (updateData.reasons[latestRequiredVersion]) {
        moreText += `<br><br>Reason: ${updateData.reasons[latestRequiredVersion]}`
    }

    let popupHtml = `
        <div id="update-popup">
            <div id="update-content">
                New ACX Tweaks version available.<br>
                ${updateUrl ? `Update <a href="${updateUrl}" id="update-url" target="_blank">here</a>.` : ""}

                <div id="update-more-info">
                    <img src="${iconSvg}" id="update-caret-icon">
                    More info
                </div>

                <div id="update-more" class="closed">
                    ${moreText}
                </div>

                <div id="update-checkbox">
                    <input type="checkbox" id="update-dont-show-again">
                    <label id="update-checkbox-label" for="update-dont-show-again">Don't show again</label>
                </div>

                <button id="update-close">Close</button>
            </div>
        </div>
    `;

    let popupStyling = `
        <style id="update-css">
            #update-popup {
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 250px;
                border: 1px solid white;
                border-radius: 10px;
                padding: 15px;
                background: #3b3b3b;
                color: white;
                font: 14px Verdana, sans-serif;
            }

            #update-caret-icon {
                filter: invert(100%) sepia(0%) saturate(0%) hue-rotate(157deg) brightness(102%) contrast(101%);
                width: 11px;
                height: 11px;
                display: inline-block;
                transition: .1s ease-in;
            }

            #update-url {
                color: white;
            }

            #update-more-info {
                margin-top: 10px;
                font: 12px Verdana, sans-serif;
                cursor: pointer;
            }

            #update-more {
                font: 12px Verdana, sans-serif;
                border: 1px solid #888;
                margin-top: 5px;
                margin-bottom: 5px;
                padding: 5px;
                max-height: 100px;
                overflow: scroll;
                overflow-x: hidden;
                transition: max-height .1s ease-in;
            }

            #update-more.closed {
                max-height: 0;
                padding: 0;
                border: none;
            }

            #update-checkbox {
                margin-bottom: 5px;
            }

            #update-dont-show-again {
                margin-left: 0;
                vertical-align: middle;
                cursor: pointer;
            }

            #update-checkbox-label {
                vertical-align: middle;
                user-select: none;
                font: 12px Verdana, sans-serif;
                cursor: pointer;
            }

            #update-close {
                cursor: pointer;
            }
        </style>
    `;

    $("body").append(popupHtml);
    $(document.documentElement).append(popupStyling);

    $("#update-more-info").click(function() {
        if ($(this).hasClass("open")) {
            $(this).removeClass("open");
            $("#update-caret-icon").css("transform", "rotate(0deg)");
            $("#update-more").addClass("closed");
        } else {
            $(this).addClass("open");
            $("#update-caret-icon").css("transform", "rotate(90deg)");
            $("#update-more").removeClass("closed");
        }
    });

    $("#update-close").click(function() {
        if ($("#update-dont-show-again").prop("checked")) {
            setOption("hideUpdateNotice", true);
            saveLocalStorage();
        }

        $("#update-popup").remove();
        $("#update-css").remove();
    });
}

// called when the DOM is loaded
async function setup() {
    if (getPageType() === PageTypeEnum.post) {
        await processPreloads();
        updatePostReadDate();
    }

    addDomObserver();
    addKeyListener();
    setTimeout(checkForUpdates, 5000);
}



// actually do the things

async function doAllSetup() {
    await preloadSetup();
    $(document).ready(setup);
}

doAllSetup();
