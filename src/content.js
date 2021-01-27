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
OPTIONS.useOldStyling.toggleFunc = useOldStylingOption;
OPTIONS.loadAll.toggleFunc = loadAllOption;
OPTIONS.hideNew.toggleFunc = hideNewOption;

const PageTypeEnum = Object.freeze({
    "main": "main",
    "post": "post",
    "unknown": "unknown",
});

// cache of the current options
let optionShadow = {};



// Utilities

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

function getLocalState(storageId) {
    let storagePromise = new Promise(function(resolve, reject) {
        webExtension.storage.local.get(storageId, function(items) {
            resolve(items);
        });
    });

    return storagePromise;
}



// Dealing with option changes

function fixHeaderOption(value) {
    $("#fixHeader-css").prop("disabled", !value);
}

function hideHeartsOption(value) {
    $("#hideHearts-css").prop("disabled", !value);
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



// First processing of different page types

function processMainPage() {
    // nothing to do
}

async function processPostPage() {
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
    for (let key in OPTIONS) {
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
        } else {
            console.error("Bad run time found: " + OPTIONS[key].runTime);
        }

        // update the option shadow
        optionShadow[key] = value;
    }
}

async function preloadSetup() {
    addStyles();
    await loadInitialOptionValues();
    webExtension.storage.onChanged.addListener(processStorageChange);
}



// Initial setup on first page load

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

async function setup() {
    // addDomObserver();
    processNewPageType();

    $("#entry").on("click", ".comment-actions > span:nth-child(2)", function() {
        let comment = $(this).closest(".comment");
        let id = comment.children().first().attr("id")
        window.location.hash = id;
    })
}



// actually do the things

preloadSetup();
$(document).ready(setup);
