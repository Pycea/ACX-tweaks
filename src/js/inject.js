addEventListener("DOMContentLoaded", () => {
    window.postMessage({handshake: "acx-tweaks-preloads", preloads: window._preloads}, "https://www.astralcodexten.com");
});