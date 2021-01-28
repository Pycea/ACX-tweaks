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
OPTIONS.useOldStyling.toggleFunc = useOldStylingOption;
OPTIONS.loadAll.toggleFunc = loadAllOption;
OPTIONS.hideNew.toggleFunc = hideNewOption;
OPTIONS.dynamicLoad.toggleFunc = dynamicLoadOption;

const PageTypeEnum = Object.freeze({
    "main": "main",
    "post": "post",
    "unknown": "unknown",
});

// cache of the current options
let optionShadow = {};

// bunch of metadata
let preloads;

// cache of comment ids to exact comment time
let commentIdToDate;



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

function showFullDateOption(value) {
    $("#showFullDate-css").prop("disabled", !value);
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

function dynamicLoadOption(value) {
    // nothing to do, value is read from options shadow where needed
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
    hour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);

    return `${month} ${day}, ${year} at ${hour}:${minute} ${amPm}`;
}

function addDateString(comment) {
    let idString = $(comment).children(":first").attr("id");
    let idRegexMatch = idString.match(/comment-(\d+)/);

    if (!idRegexMatch) {
        console.error(`Bad comment id found: ${idString}`);
        return;
    }

    let id = idRegexMatch[1];
    let dateSpan = $(comment).find("> .comment-content .comment-meta > span:nth-child(2)");
    let newDateDisplay = dateSpan.children(":first").clone();
    newDateDisplay.addClass("better-date");

    if (dateSpan.find(".better-date").length === 0) {
        dateSpan.append(newDateDisplay);
    }

    if (id in commentIdToDate) {
        let utcTime = commentIdToDate[id];
        let date = new Date(utcTime);
        newDateDisplay.html(getLocalDateString(date));
    } else {
        // comments will fail during dynamic load, no need to spam the console
        if (!optionShadow.dynamicLoad) {
            console.error(`Could not find comment id ${id}`);
        }
    }
}

// processes to apply to all comments and children in a given dom element
function processAllComments(node) {
    $(node).find("div.comment").addBack("div.comment").each(function() {
        addDateString(this);
    });
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
    if (mutation.target.id === "main" || (mutation.target.classList.contains("single-post") && mutation.addedNodes[0].tagName.toLowerCase() === "article")) {
        // we switched to a different page with pushState
        if (optionShadow.dynamicLoad) {
            processNewPageType();
        } else {
            // force refresh
            window.location.href = window.location.href;
        }
    } else {
        // check for comments
        if (commentIdToDate) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                processAllComments(mutation.addedNodes[i]);
            }
        }
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
        console.error("Could not find _preloads.comments");
        return;
    }

    commentIdToDate = {};

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

async function setup() {
    processPreloads();
    addDomObserver();
    processNewPageType();

    // clicking on fake css permalink link
    $("#entry").on("click", ".comment-actions > span:nth-child(2)", function() {
        let comment = $(this).closest(".comment");
        let id = comment.children().first().attr("id")
        window.location.hash = id;
    });
}



// actually do the things

preloadSetup();
$(document).ready(setup);
