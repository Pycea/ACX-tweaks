addEventListener("DOMContentLoaded", () => {
    window.postMessage({
        handshake: "acx-tweaks-preloads",
        preloads: window._preloads
    }, "https://www.astralcodexten.com");
});

history.pushState = function(_, _, url) {
    location.href = url;
};