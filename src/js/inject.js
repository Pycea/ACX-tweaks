function sendMessage() {
    window.postMessage({
        handshake: "acx-tweaks-preloads",
        preloads: window._preloads
    }, "https://www.astralcodexten.com");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sendMessage);
} else {
    sendMessage();
}

history.pushState = function(_, _, url) {
    location.href = url;
};