// DEBUG handles
// ajax*
//     ajaxCall: the request params
//     ajaxResponse: the response given
//     ajaxError: any errors encountered

// the local storage key of the options
const OPTION_KEY = "options";

// the local storage key of the page last visited time
// SEEN_COMMENTS_KEY: {
//     "title": [
//         commentId,
//         ...
//     ],
//     ...
// }
const LOCAL_DATA_KEY = "acx-local-data";

function debug(category, ...debugStrings) {
    if (!optionShadow.showDebug) {
        return;
    }

    let debugRegex = "^(" +
        optionShadow.showDebug
            .replace(/ /g, "")
            .replace(/(?<!\.)\*/g, ".*")
            .replace(/,/g, "|")
             + ")$";
    if (category.match(debugRegex)) {
        let now = Date.now();
        let time = new Date(now).toLocaleTimeString("en-US", {hour12: false});
        let ms = (now % 1000).toString().padStart(3, "0");
        console.log(`${time}.${ms}  ${category}:`, ...debugStrings);
    }
}

function logFuncCall(verbose=false) {
    if (!optionShadow.showDebug) {
        return;
    }

    let errorStack = new Error().stack;
    let funcLine = errorStack.split("\n")[2].trim();
    let funcNameMatch = funcLine.match(/at (\w+)/);
    if (!funcNameMatch) {
        console.error(`Bad stack found: ${errorStack}`);
        return;
    }

    let funcName = funcNameMatch[1];
    let logHandle = (verbose ? "func" : "funcs") + "_" + funcName;

    debug(logHandle, funcName + "()");
}

// why is js so terrible?
function mod(a, b) {
    return ((a % b) + b) % b;
}

function ajaxRequest(url, data={}, method="GET", dataType="text json") {
    logFuncCall();
    debug("ajaxCall", url, data, method, dataType);
    return $.ajax({
        url: url,
        data: data,
        dataType: dataType,
        method: method,
        success: function(data, status) {
            debug("ajaxResponse", data, status);
        },
        error: function(jqXHR, error, exception) {
            debug("ajaxError", error, exception);
        },
    });
}

async function getPostData() {
    logFuncCall();
    let url = `https://astralcodexten.substack.com/api/v1/posts/${getPostName()}`;
    let data = await ajaxRequest(url);
    return data;
}

async function getPostComments() {
    logFuncCall();
    let postData = await getPostData();
    let postId = postData.id;
    let url = `https://astralcodexten.substack.com/api/v1/post/${postId}/comments?token=&all_comments=true`;
    let data = await ajaxRequest(url);
    return data.comments;
}

async function getVersionInfo() {
    logFuncCall();
    let url = "https://gist.githubusercontent.com/Pycea/a647f861e7ad2b2ae28b512cd68864cc/raw";
    try {
        let data = await ajaxRequest(url);
        return data;
    } catch (error) {
        console.error(error);
        return {};
    }
}

function validateVersion(version) {
    if (!version) return false;
    let match = version.match(/^\d+(.\d+)*$/);
    return !!match;
}

function compareVersion(versionA, versionB) {
    if (versionA === versionB) return 0;
    if (!versionB) return 1;
    if (!versionA) return -1;

    let splitA = versionA.split(".");
    let splitB = versionB.split(".");
    for (let i = 0; i < Math.max(splitA.length, splitB.length); i++) {
        let na = Number(splitA[i]);
        let nb = Number(splitB[i]);

        if (!isNaN(na) && isNaN(nb)) return 1;
        if (isNaN(na) && !isNaN(nb)) return -1;

        if (na > nb) return 1;
        if (na < nb) return -1;
    }

    return 0;
}

function getLocalState(storageId) {
    let storagePromise = new Promise(function(resolve, reject) {
        webExtension.storage.local.get(storageId, function(items) {
            resolve(items[storageId]);
        });
    });

    return storagePromise;
}

function getCommentId(comment) {
    if (comment instanceof jQuery) {
        comment = comment[0];
    }

    return comment.firstElementChild.id;
}

function getCommentIdNumber(comment) {
    let idString = getCommentId(comment);
    let id = parseInt(idString.substring(8));

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

    let keyDict = {
        "key": event.keyCode || null,
        "control": event.ctrlKey || false,
        "alt": event.altKey || false,
        "shift": event.shiftKey || false,
        "meta": event.metaKey || false,
    }

    return keyDict;
}

function isMatchingKeyEvent(keyDict, event) {
    let eventDict = getKeyDictFromEvent(event);
    for (const [key, value] of Object.entries(keyDict)) {
        if (value != eventDict[key]) {
            return false;
        }
    }
    return true;
}

function getKeyPress() {
    logFuncCall();
    return new Promise(function(resolve, reject) {
        function keyPress(event) {
            if (!["Control", "Alt", "Shift", "Meta"].includes(event.key)) {
                resolve(getKeyDictFromEvent(event));
            } else {
                $(document).one("keydown", keyPress);
            }
        }

        $(document).one("keydown", keyPress);
        $(document).one("mousedown", function(event) {
            resolve(getKeyDictFromEvent(null));
        });
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
        return this.soFar == this.string;
    }
}
