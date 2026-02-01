chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    if (msg === "get-platform") {
        chrome.runtime.getPlatformInfo().then((r) => sendResponse(r.os));
        return true;
    }
});
