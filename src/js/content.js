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

// DEBUG handles
// option*
//     optionInitial: initial option values
//     optionGet: receive option change
//     optionSet: setting option value
// processComment: each comment processed
// mutation*
//     mutationType: known types of mutation
//     mutationOther: other mutations
// keyPress*
//     keyPress: each key press
//     keyPressBinary: binary search internals
// updateCheck: related to update checks
// pageLoadFsm: related to page loading events
// func*
//     func_<func_name>: function calls that are called a lot and probably not too useful
//     funcs_<func_name>: other function calls

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
//     <post name>: {
//         "lastViewedDate": <date>,
//     },
//     ...
// }
let localStorageData;

// cache of comment ids comment info
// {
//     <comment id>: {
//         "date": <date>,
//         "hearts": <num>,
//         "userReact": <user liked comment>,
//         "deleted": <deleted>,
//     },
//     ...
// }
let commentIdToInfo = {};

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
    logFuncCall();
    debug("optionSet", `Changing option ${key}, `, optionShadow[key], "->", value);
    optionShadow[key] = value;
    webExtension.storage.local.set({[OPTION_KEY]: optionShadow});
}

// calls the option handling function for the given option value
function doOptionChange(key, value) {
    logFuncCall();
    if (key in OPTIONS && OPTIONS[key].onValueChange) {
        debug("optionGet", `Processing option change for ${key}`);
        debug("funcs_" + key + ".onValueChange", key + ".onValueChange()");
        OPTIONS[key].onValueChange(value, false);
    }
}

// processes local storage changes, and calls the appropriate option handling function if an option
// was changed
function processStorageChange(changes, namespace) {
    logFuncCall();
    if (namespace === "local") {
        if (changes.options) {
            let changedKeys = [];

            for (let key in changes.options.newValue) {
                // ew, but I don't really want to implement isEqual for dicts
                let newValueString = JSON.stringify(changes.options.newValue[key]);
                let oldValueString = JSON.stringify(optionShadow[key]);

                if (newValueString !== oldValueString) {
                    debug("optionGet", `Got change for ${key}`, changes.options.oldValue[key], "->", changes.options.newValue[key]);
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
    logFuncCall(true);
    let postName = getPostName();
    if (!(postName in localStorageData)) {
        localStorageData[postName] = {
            "lastViewedDate": new Date().toISOString(),
        }
    }
}

// update the local storage with our cached version
function saveLocalStorage() {
    logFuncCall();
    window.localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(localStorageData));
}

function addCustomCollapser(collapser) {
    logFuncCall(true);
    collapser = $(collapser);

    if (collapser.parent().children(".custom-collapser").length > 0) {
        return;
    }

    collapser.css("display", "none");
    let comment = collapser.parent();

    let newCollapser = $(`
        <div class="comment-list-collapser custom-collapser">
            <div class="comment-list-collapser-line"></div>
        </div>`);
    $(comment).append(newCollapser);

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
    logFuncCall();
    processChildComments($("#main"));
}

// processes to apply to all comments and children in a given dom element
function processChildComments(node) {
    logFuncCall(true);
    let commentHandlerObjects = [];

    for (let option in OPTIONS) {
        if (OPTIONS[option].onCommentChange && (optionShadow[option] || OPTIONS[option].alwaysProcessComments)) {
            commentHandlerObjects.push(OPTIONS[option]);
        }
    }

    if (commentHandlerObjects.length > 0) {
        $(node).find("div.comment").addBack("div.comment").each(function() {
            debug("processComment", this);

            for (let object of commentHandlerObjects) {
                debug("func_" + object.key + ".onCommentChange", object.key + ".onCommentChange()");
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
    logFuncCall(true);
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
    if (mutation.target.classList.contains("single-post") &&
        mutation.addedNodes[0].tagName.toLowerCase() === "article") {
        debug("mutationType", "switch to new page", mutation);
        // we switched to a different page with pushState
        if (optionShadow.dynamicLoad) {
            debug("pageLoadFsm", "action: dynamic page load");
            pageSetup();
            runOnLoadHandlers();
        } else {
            // don't react to any more updates
            observeChanges = false;

            // force refresh
            window.location.href = window.location.href;
        }
    } else if (nodeHasClass(mutation.target, ["comment", "comment-list", "comment-list-items", "container"])) {
        debug("mutationType", "possible comment add", mutation);

        // check for comments
        for (let i = 0; i < mutation.addedNodes.length; i++) {
            let node = mutation.addedNodes[i];
            if (nodeHasClass(node, ["comment", "comment-list", "comment-list-container", "comment-list-items", "comment-list-collapser"])) {
                processChildComments(node);
            }
        }
    } else {
        // do nothing
        debug("mutationOther", "other mutation", mutation);
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
            debug("func_" + object.key + ".onMutation", object.key + ".onMutation()");
            object.onMutation(mutation);
        }
    }
}



// Setup before page load, run once

async function loadInitialOptionValues() {
    optionShadow = await getLocalState(OPTION_KEY);
    if (!optionShadow) {
        optionShadow = {};
    }
}

function loadLocalStorage() {
    logFuncCall();
    let dataString = window.localStorage.getItem(LOCAL_DATA_KEY);
    if (!dataString) {
        dataString = "{}";
    }
    localStorageData = JSON.parse(dataString);
}

// load the initial values of the options and do any necessary config for them
function processInitialOptionValues() {
    logFuncCall();

    for (let key in OPTIONS) {
        let value = optionShadow[key];
        if (value === undefined) {
            // the option hasn't been set in local storage, set it to the default
            value = OPTIONS[key].default;
            optionShadow[key] = value;
            debug("optionInitial", `${key} not found, setting to`, value);
        } else {
            debug("optionInitial", `${key} initial value is`, value);
        }

        if (OPTIONS[key].onStart) {
            debug("funcs_" + key + ".onStart", key + ".onStart()");
            OPTIONS[key].onStart(value);
        }
    }

    webExtension.storage.local.set({[OPTION_KEY]: optionShadow});
}


function addDomObserver() {
    logFuncCall();
    let observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                processMutation(mutation);
            }
        });
    });

    observer.observe(document, {childList: true, subtree: true});
}

// reacts to key presses
function addKeyListener() {
    logFuncCall();

    document.addEventListener("keydown", function(event) {
        // don't trigger when writing
        if ($(event.target).is("input, textarea, .ProseMirror")) {
            debug("func_onKeydown", "onKeydown(", event, ")");
            return;
        } else {
            debug("funcs_onKeydown", "onKeydown(", event, ")");
        }

        if (!optionShadow.allowKeyboardShortcuts) {
            return;
        }

        debug("keyPress", event);

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
                debug("keyPressBinary", `${min} ${mid} ${max}`);
                if (inView(comments[mid])) {
                    max = mid;
                } else {
                    min = mid;
                }
                debug("keyPressBinary", `    mid is now ${mid}`);
            }

            let index;
            if (command === KeyCommandEnum.prevComment || command === KeyCommandEnum.prevUnread) {
                index = min;
                index = mod(index, comments.length);
                debug("keyPressBinary", `gong backwards, index is min, now ${index}`);
                if (atEntry(comments[index])) {
                    index--;
                    debug("keyPressBinary", `At entry, decrementing to ${index}`);
                }
            } else if (command === KeyCommandEnum.nextComment || command === KeyCommandEnum.nextUnread) {
                index = max;
                index = mod(index, comments.length);
                debug("keyPressBinary", `going forwards, index is max, now ${index}`);
                if (atEntry(comments[index])) {
                    index++;
                    debug("keyPressBinary", `At entry, incrementing to ${index}`);
                }
            } else if (command === KeyCommandEnum.parent) {
                index = max;
                debug("keyPressBinary", `getting parent, index is max, now ${index}`);
                if (index < 0 || index >= comments.length) {
                    return;
                }

                let parent = $(comments[index]).parent().parent().closest(".comment");
                if (parent.length === 0) {
                    debug("keyPressBinary", "already at top level comment");
                    return;
                }

                debug("keyPressBinary", "found parent comment");

                let scrollBehavior = optionShadow.smoothScroll ? "smooth" : "auto";
                parent[0].scrollIntoView({"behavior": scrollBehavior});
                return;
            }

            // wrap around at the top and bottom
            index = mod(index, comments.length);

            debug("keyPressBinary", `index is ${index}`, comments[index]);

            let scrollBehavior = optionShadow.smoothScroll ? "smooth" : "auto";
            comments[index].scrollIntoView({"behavior": scrollBehavior});
        }
    });
}

// called when the extension is first loaded, run only once per session
async function onStart() {
    await loadInitialOptionValues();
    logFuncCall();
    debug("pageLoadFsm", "state: onStart");
    loadLocalStorage();
    processInitialOptionValues();
    webExtension.storage.onChanged.addListener(processStorageChange);
    processAllComments(); // on the off chance there's already comments loaded
    addDomObserver();
    addKeyListener();
}



// Setup for each page, run on every page change

function updatePostReadDate() {
    logFuncCall();
    let postName = getPostName();
    ensurePostEntry(postName);
    localStorageData[postName].lastViewedDate = new Date().toISOString();
    saveLocalStorage();
}

function runOnPageChangeHandlers() {
    logFuncCall();
    for (let key in OPTIONS) {
        if (OPTIONS[key].onPageChange) {
            debug("funcs_" + key + ".onPageChange", key + ".onPageChange()");
            OPTIONS[key].onPageChange();
        }
    }
}

// create cache of comment id -> date
async function createCommentDateCache() {
    logFuncCall();

    function getDateRecursive(comment) {
        let id = comment.id;
        let userId = comment.user_id;
        let ancestorPath = comment.ancestor_path;
        let date = comment.date;
        let editedDate = comment.edited_at;
        let hearts = comment.reactions?.["❤"];
        let userReact = comment.reaction;
        let deleted = comment.deleted;
        commentIdToInfo[id] = {
            "userId": userId,
            "ancestorPath": ancestorPath,
            "date": date,
            "editedDate": editedDate,
            "hearts": hearts,
            "userReact": userReact,
            "deleted": deleted,
        };

        for (let childComment of comment.children) {
            getDateRecursive(childComment);
        }
    }

    let comments = await getPostComments();

    commentIdToInfo = {};
    for (let comment of comments) {
        getDateRecursive(comment);
    }
}

// called for each new page in a session
async function pageSetup() {
    logFuncCall();
    debug("pageLoadFsm", `state: onPageChange, new page '${getPostName()}'`);

    if (getPageType() === PageTypeEnum.post) {
        updatePostReadDate();
        runOnPageChangeHandlers();
        await createCommentDateCache();
        processAllComments();
    }
}



// Setup once the DOM is loaded

async function checkForUpdates() {
    logFuncCall();

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

    debug("updateCheck", `current version is ${currentVersion}`);
    debug("updateCheck", `lastest required version is ${latestRequiredVersion}`);

    if (compareVersion(currentVersion, latestRequiredVersion) >= 0) {
        debug("updateCheck", "no update required");
        return;
    }

    let updateUrl;
    if (typeof browser !== "undefined") {
        updateUrl = "https://addons.mozilla.org/en-US/firefox/addon/acx-tweaks/";
        debug("updateCheck", "update required, Firefox");
    } else if (typeof chrome !== "undefined"){
        updateUrl = "https://chrome.google.com/webstore/detail/acx-tweaks/jdpghojhfigbpoeiadalafcmohaekglf";
        debug("updateCheck", "update required, Chrome");
    } else {
        console.error("Can't get update url.");
        debug("updateCheck", "update required, unknown browser");
    }

    let iconSvg = webExtension.extension.getURL("icons/caret-right-solid.svg");

    let moreText = `You are on version ${currentVersion}. Without the latest version, ${latestRequiredVersion}, some stuff on the page might break.`;
    if (updateData.reasons[latestRequiredVersion]) {
        moreText += `<br><br>Reason: ${updateData.reasons[latestRequiredVersion]}`;
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
        }

        $("#update-popup").remove();
        $("#update-css").remove();
    });
}

function runOnLoadHandlers() {
    logFuncCall();
    for (let key in OPTIONS) {
        if (OPTIONS[key].onLoad) {
            debug("funcs_" + key + ".onLoad", key + ".onLoad()");
            OPTIONS[key].onLoad();
        }
    }
}

// called when the DOM is loaded, run only once per session
async function onLoad() {
    logFuncCall();
    debug("pageLoadFsm", "state: onLoad");
    runOnLoadHandlers();
}



// actually do the things

async function doAllSetup() {
    await onStart();
    await pageSetup();
    $(document).ready(onLoad);
}

doAllSetup();
