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

OPTIONS.fixHeader.toggleFunc = fixHeaderOption;
OPTIONS.hideHearts.toggleFunc = hideHeartsOption;
OPTIONS.loadAll.toggleFunc = loadAllOption;
OPTIONS.hideNew.toggleFunc = hideNewOption;

const PageTypeEnum = Object.freeze({
    "main": "main",
    "post": "post",
    "unknown": "unknown",
});

// cache of the current options
let optionShadow = {};



// the URL of the page without any hashes or params
function baseUrl() {
    return window.location.origin + window.location.pathname;
}

function getPageType() {
    if (window.location.href.match(/astralcodexten.substack.com\/p\/[^/]+/)) {
        return PageTypeEnum.post;
    } else {
        return PageTypeEnum.main;
    }
}



// Dealing with option changes

function fixHeaderOption(value) {
    if (value) {
        $("body").addClass("fix-header");
    } else {
        $("body").removeClass("fix-header");
    }
}

function hideHeartsOption(value) {
    if (value) {
        $("body").addClass("no-heart");
    } else {
        $("body").removeClass("no-heart");
    }
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
    if (value) {
        $("body").addClass("hide-new");
    } else {
        $("body").removeClass("hide-new");
    }
}

// calls the appropriate option handling function for a given option value
function doOptionChange(key, value) {
    if (key in OPTIONS && OPTIONS[key].toggleFunc) {
        OPTIONS[key].toggleFunc(value);
    }
}

// processes local storage changes, and calls the appropriate option handling function if an option
// was changed
function processStorageChange(changes, namespace) {
    if (namespace === "local") {
        for (let key in changes) {
            doOptionChange(key, changes[key].newValue);

            // update option shadow
            optionShadow[key] = changes[key].newValue;
        }
    }
}



// Individual comment processing

// adds a permalink button to the given comment
function addPermalink(comment) {
    let url = baseUrl();
    let commentId = $(comment).children(":first").attr("id");
    let permalinkId = "perm-" + commentId;
    let permalinkPath = url + "#" + commentId;
    let permalinkNode = $(`<span id=${permalinkId}><a href="${permalinkPath}">Permalink</a></span>`);
    let commentActions = $(comment).find("> .comment-content > tr > td > .comment-actions")

    // don't add permalink twice
    if (commentActions.find(`#${permalinkId}`).length == 0) {
        commentActions.append(permalinkNode);
    
        $("#" + permalinkId).click(function() {
            $(".anchored-comment").removeClass("anchored-comment");
            $("#" + commentId).parent().children("table").addClass("anchored-comment");
        });
    }
}

// processes to apply to all comments and children in a given dom element
function processAllComments(node) {
    $(node).find("div.comment").addBack("div.comment").each(function() {
        addPermalink(this);
    });
}



// First processing of different page types

function processMainPage() {
    // nothing to do
}

async function processPostPage() {
    let container = $("#main");
    processAllComments(container);

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
    // is this a hack? even the wisest cannot tell
    if (mutation.target.id === "main") {
        // we switched page types with pushState
        processNewPageType();
    } else if (mutation.target.classList.contains("single-post") &&
        mutation.addedNodes[0].tagName.toLowerCase() === "article") {
        // we switched directly to a different post with pushState
        processNewPageType();
    } else {
        // check for comments just in case
        for (let node of mutation.addedNodes) {
            processAllComments(node);
        }
    }
}



// Initial setup on first page load

function getLocalState(storageId) {
    let storagePromise = new Promise(function(resolve, reject) {
        webExtension.storage.local.get(storageId, function(items) {
            resolve(items);
        });
    });

    return storagePromise;
}

async function loadInitialOptionValues() {
    for (let key in OPTIONS) {
        let storageValue = await getLocalState(key);
        let value = storageValue[key];
        if (value === undefined) {
            // the option hasn't been set in local storage, set it to the default
            value = OPTIONS[key].default;
            webExtension.storage.local.set({[key]: value});
        }
        doOptionChange(key, value);

        // update the option shadow
        optionShadow[key] = value;
    }
}

async function setup() {
    await loadInitialOptionValues();

    webExtension.storage.onChanged.addListener(processStorageChange);

    let observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                processMutation(mutation);
            }
        });
    });

    let container = $("#entry")[0];
    observer.observe(container, {childList: true, subtree: true});

    processNewPageType();
}



window.onload = setup;
