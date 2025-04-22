"use strict";

// DEBUG handles
// fetch*
//     fetchCall: the request params
//     fetchResponse: the response given
//     fetchError: any errors encountered

function debug(category, ...debugStrings) {
    if (!optionManager.get(OptionKey.showDebug)) {
        return;
    }

    const debugRegex = "^(" +
        optionManager.get(OptionKey.showDebug)
            .replace(/ /g, "")
            .replace(/(?<!\.)\*/g, ".*")
            .replace(/,/g, "|")
            + ")$";
    if (category.match(debugRegex)) {
        const now = Date.now();
        const time = new Date(now).toLocaleTimeString("en-US", {hour12: false});
        const ms = (now % 1000).toString().padStart(3, "0");
        console.log(`${time}.${ms}  ${category}:`, ...debugStrings);
    }
}

function logFuncCall(verbose=false) {
    if (!optionManager.get(OptionKey.showDebug)) {
        return;
    }

    const errorStack = new Error().stack;
    const funcLine = errorStack.split("\n")[2].trim();
    const funcNameMatch = funcLine.match(/at ([\w.]+)/);
    if (!funcNameMatch) {
        console.error(`Bad stack found: ${errorStack}`);
        return;
    }

    const funcName = funcNameMatch[1];
    const logHandle = (verbose ? "func" : "funcs") + "_" + funcName;

    debug(logHandle, funcName + "()");
}

function testPerformance(operation) {
    performance.clearMarks();
    performance.clearMeasures();
    document.body.offsetHeight;

    performance.mark("start");
    operation();
    document.body.offsetHeight;
    performance.mark("end");
    performance.measure("domOp", "start", "end");
    console.log(performance.getEntriesByName("domOp")[0]);
}

function mod(a, b) {
    return ((a % b) + b) % b;
}

function getPreloads() {
    const injectionScript = document.createElement("script");
    injectionScript.src = chrome.runtime.getURL("js/inject.js");
    document.documentElement.appendChild(injectionScript);
    injectionScript.onload = () => injectionScript.remove();

    return new Promise((resolve) => {
        window.addEventListener("message", (event) => {
            if (event.source === window && event.data.handshake === "acx-tweaks-preloads") {
                resolve(event.data.preloads);
            }
        });
    });
}

function apiCall(url, method="GET", data={}, timeout=10) {
    logFuncCall();
    debug("fetchCall", url, data, method);
    const options = {
        method: method,
        headers: {"Content-Type": "application/json"},
        signal: AbortSignal.timeout(timeout * 1000),
    };
    if (method !== "GET" && method !== "HEAD") {
        options.body = JSON.stringify(data);
    }
    return fetch(url, options)
        .then(response => response.json())
        .then((data) => {
            debug("fetchResponse", data);
            return data;
        })
        .catch((error) => {
            debug("fetchError", error);
            throw error;
        });
}

async function loadTemplate(url) {
    logFuncCall();
    const res = await fetch(url);
    const text = await res.text();
    const template = document.createElement("template");
    template.innerHTML = text.trim();
    return template;
}

async function getPostData() {
    logFuncCall();
    const url = `https://www.astralcodexten.com/api/v1/posts/${getPostName()}`;
    const data = await apiCall(url);
    return data;
}

async function getPostComments() {
    logFuncCall();
    const postData = await getPostData();
    const postId = postData.id;
    const url = `https://www.astralcodexten.com/api/v1/post/${postId}/comments?block=false&token=&all_comments=true`;
    const data = await apiCall(url);
    return data.comments;
}

function getPostName() {
    const match = window.location.pathname.match(/\/p\/([^/]+)/);
    if (match) {
        return match[1];
    }
    return null;
}

function getCommentId(comment) {
    if (comment instanceof jQuery) {
        comment = comment[0];
    }

    return comment.firstElementChild.id;
}

function getCommentIdNumber(comment) {
    const idString = getCommentId(comment);
    const id = parseInt(idString.substring(8));

    if (!id) {
        console.error(`Bad comment id found: ${idString}`);
        return;
    }

    return id;
}

const keyCodes = {
    8: "backspace",
    9: "tab",
    13: "enter",
    16: "shift",
    17: "ctrl",
    18: "alt",
    19: "pause/break",
    20: "caps lock",
    27: "escape",
    33: "page up",
    34: "page down",
    35: "end",
    36: "home",
    37: "left arrow",
    38: "up arrow",
    39: "right arrow",
    40: "down arrow",
    45: "insert",
    46: "delete",
    91: "left window",
    92: "right window",
    93: "select key",
    96: "numpad 0",
    97: "numpad 1",
    98: "numpad 2",
    99: "numpad 3",
    100: "numpad 4",
    101: "numpad 5",
    102: "numpad 6",
    103: "numpad 7",
    104: "numpad 8",
    105: "numpad 9",
    106: "multiply",
    107: "add",
    109: "subtract",
    110: "decimal point",
    111: "divide",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "num lock",
    145: "scroll lock",
    186: ";",
    187: "=",
    188: ",",
    189: "-",
    190: ".",
    191: "/",
    192: "`",
    219: "[",
    220: "\\",
    221: "]",
    222: "'",
};

function keyDictToString(keyDict) {
    if (keyDict.key === null) {
        return "none";
    }

    let keyString = keyCodes[keyDict.key] || String.fromCharCode(keyDict.key);
    if (keyDict.meta) {
        keyString = "command-" + keyString;
    }
    if (keyDict.shift) {
        keyString = "shift-" + keyString;
    }
    if (keyDict.alt) {
        keyString = "alt-" + keyString;
    }
    if (keyDict.control) {
        keyString = "ctrl-" + keyString;
    }

    return keyString;
}

function getKeyDictFromEvent(event) {
    if (!event) {
        event = {};
    }

    const keyDict = {
        "key": event.keyCode || null,
        "control": event.ctrlKey || false,
        "alt": event.altKey || false,
        "shift": event.shiftKey || false,
        "meta": event.metaKey || false,
    }

    return keyDict;
}

function isMatchingKeyEvent(keyDict, event) {
    const eventDict = getKeyDictFromEvent(event);
    for (const [key, value] of Object.entries(keyDict)) {
        if (value !== eventDict[key]) {
            return false;
        }
    }
    return true;
}

function getKeyPress() {
    return new Promise(function(resolve) {
        function keyPress(event) {
            if (!["Control", "Alt", "Shift", "Meta"].includes(event.key)) {
                resolve(getKeyDictFromEvent(event));
            } else {
                document.addEventListener("keydown", keyPress, {once: true});
            }
        }

        document.addEventListener("keydown", keyPress, {once: true});
        document.addEventListener("mousedown", () => {
            resolve(getKeyDictFromEvent(null));
        }, {once: true});
    });
}

class StringRecognizer {
    constructor(string) {
        this.string = string;
        this.soFar = " ".repeat(string.length);
    }

    nextInput(char) {
        this.soFar += char;
        this.soFar = this.soFar.substring(1);
        return this.soFar === this.string;
    }
}
