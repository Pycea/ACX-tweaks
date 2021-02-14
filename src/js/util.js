// the local storage key of the options
const OPTION_KEY = "options";

// the local storage key of the page last visited time
const SEEN_DATES_KEY = "seenDates";

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

function getLocalState(storageId) {
    let storagePromise = new Promise(function(resolve, reject) {
        webExtension.storage.local.get(storageId, function(items) {
            resolve(items[storageId]);
        });
    });

    return storagePromise;
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
    for (let key in keyDict) {
        if (keyDict[key] != eventDict[key]) {
            return false;
        }
    }
    return true;
}

function getKeyPress() {
    return new Promise(function(resolve, reject) {
        $(document).one("keydown", function(event) {
            if (!["Control", "Alt", "Shift", "Meta"].includes(event.key)) {
                resolve(getKeyDictFromEvent(event));
            }
        });
        $(document).one("mousedown", function(event) {
            resolve(getKeyDictFromEvent(null));
        });
    });
}
