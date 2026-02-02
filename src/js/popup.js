"use strict";

// cache of the current options
let optionShadow;

async function loadInitialOptionValues() {
    const result = await chrome.storage.local.get([OPTION_KEY]);
    if (result[OPTION_KEY]) {
        optionShadow = result[OPTION_KEY];
    } else {
        optionShadow = {};
    }

    for (const [key, option] of Object.entries(OPTIONS)) {
        if (optionShadow[key] === undefined) {
            optionShadow[key] = option.default;
        }
    }
}

function setOption(key, value) {
    optionShadow[key] = value;
    chrome.storage.local.set({[OPTION_KEY]: optionShadow});
}



// custom handlers

function newTimeHandler() {
    // value is time length in minutes
    const units = document.querySelector("#newTimeNumber").value;
    const multiplier = document.querySelector("#newTimeSelect").value;
    const timeMs = units * multiplier * 60 * 1000; // x60000 for minutes to ms
    setOption("newTime", timeMs);
}

const CUSTOM_TRIGGERS = {
    newTime: newTimeHandler,
}

function newTimeState(value) {
    // value is in milliseconds

    // numValue is the numerical part of the setting, without the units
    // start out with minutes
    let numValue = value / 1000 / 60;

    // the value of the select is the number of minutes for the given time
    let selectSetting = 1;

    // if it's an even number of hours, use those instead
    if (numValue % 60 === 0) {
        numValue /= 60;
        selectSetting *= 60;
    }

    // if it's an even number of days, use those instead
    if (numValue % 24 === 0) {
        numValue /= 24;
        selectSetting *= 24;
    }

    document.querySelector("#newTimeSelect").value = selectSetting;
    document.querySelector("#newTimeNumber").value = numValue;
}

const CUSTOM_SET_STATE = {
    newTime: newTimeState,
}




function addHovertext(optionElem) {
    const id = optionElem.id;
    const iconSvg = chrome.runtime.getURL("icons/question-circle-regular.svg");
    const icon = document.createElement("img");
    icon.src = iconSvg;
    icon.className = "help-icon";
    icon.alt = OPTIONS[id].hovertext.replace(/<.*?>/g, "");
    const tooltip = document.createElement("span");
    tooltip.id = `${id}-tooltip`;
    tooltip.classList.add("tooltip", "hidden");
    tooltip.innerHTML = OPTIONS[id].hovertext;
    optionElem.appendChild(icon);
    document.getElementById("wrapper").appendChild(tooltip);

    function showTooltip() {
        tooltip.classList.remove("hidden");
        const windowHeight = window.innerHeight;
        const tooltipMargin = 15;
        const tooltipHeight = tooltip.getBoundingClientRect().height;
        // icon height is 14, 7 is the middle
        const iconPosition = icon.getBoundingClientRect().top + 7;
        const topSpace = iconPosition - tooltipHeight;
        const bottomSpace = (windowHeight - tooltipHeight) - iconPosition;

        if (topSpace > 2 * tooltipMargin) {
            tooltip.style.top = `${iconPosition - tooltipHeight - tooltipMargin}px`;
        } else if (bottomSpace > 2 * tooltipMargin) {
            tooltip.style.top = `${iconPosition + tooltipMargin}px`;
        } else {
            tooltip.style.top = `${tooltipMargin}px`;
        }
    }

    function hideTooltip() {
        tooltip.classList.add("hidden");
    }

    function hideAllTooltips() {
        document.querySelectorAll(".tooltip:not(.nohide)").forEach(e => e.classList.add("hidden"));
    }

    icon.addEventListener("mouseenter", showTooltip);
    icon.addEventListener("mouseleave", hideTooltip);

    icon.addEventListener("touchstart", (event) => {
        if (tooltip.classList.contains("hidden")) {
            hideAllTooltips();
            showTooltip();
        } else {
            hideTooltip();
        }
        event.stopPropagation();
    });

    document.addEventListener("touchstart", () => {
        hideAllTooltips();
    });
}

function createChangeHandler(optionElem) {
    const id = optionElem.id;
    const inputs = optionElem.querySelectorAll(".trigger");

    // call custom handler if defined
    if (id in CUSTOM_TRIGGERS) {
        inputs.forEach((input) => {
            input.addEventListener("change", CUSTOM_TRIGGERS[id]);
        });
        return;
    } else if (inputs.length !== 1) {
        throw Error(`${id}: Options with multiple inputs require custom handlers`);
    }

    const input = inputs[0];

    // otherwise create default handler
    if (input.classList.contains("check")) {
        input.addEventListener("change", () => setOption(id, input.checked));
    } else if (input.classList.contains("key")) {
        input.addEventListener("focus", async () => {
            input.blur();
            document.getElementById("key-input-wrapper").style.display = "inline";
            const keyPress = await getKeyPress();
            setOption(id, keyPress);
            const displayValue = keyDictToString(keyPress);
            input.value = displayValue;
            document.getElementById("key-input-wrapper").style.display = "none";
        });
    } else if (input.classList.contains("text")) {
        input.addEventListener("change", () => setOption(id, input.value));
    } else if (input.classList.contains("select")) {
        input.addEventListener("change", () => setOption(id, input.value));
    }
}

function setInitialState(optionElem) {
    const id = optionElem.id;
    const input = optionElem.querySelector(".trigger");
    const setValue = optionShadow[id];

    // call custom state setting function if defined
    if (id in CUSTOM_SET_STATE) {
        CUSTOM_SET_STATE[id](setValue);
        return;
    }

    if (input.classList.contains("check")) {
        input.checked = setValue;
    } else if (input.classList.contains("key")) {
        const displayValue = keyDictToString(setValue);
        input.value = displayValue;
    } else if (input.classList.contains("text")) {
        input.value = setValue;
    } else if (input.classList.contains("select")) {
        input.value = setValue;
    }
}

function processOption(optionElem) {
    const id = optionElem.id;
    if (!OPTIONS[id]) {
        return;
    }
    addHovertext(optionElem);
    createChangeHandler(optionElem);
    setInitialState(optionElem);
}

function addKeyModal() {
    const modalWrapper = document.createElement("span");
    const background = document.createElement("span");
    const modal = document.createElement("span");
    modalWrapper.id = "key-input-wrapper";
    modalWrapper.style.display = "none";
    background.id = "key-input-background";
    modal.id = "key-input-text";
    modal.classList.add("tooltip", "center", "nohide");
    modal.textContent = "Press a key or key combo, or click anywhere to disable";
    modalWrapper.appendChild(background);
    modalWrapper.appendChild(modal);
    document.getElementById("wrapper").appendChild(modalWrapper);
}

function createResetHandler() {
    // on the first click, verify intension
    function firstClick(button) {
        const width = button.getBoundingClientRect().width;
        button.classList.add("verify");
        button.textContent = "Are you sure?";
        button.style.width = `${width}px`;
    }

    // on the second click, clear the data
    function secondClick(button) {
        button.classList.remove("verify");
        button.textContent = "Reset all data";

        // reset options to defaults
        for (const [key, option] of Object.entries(OPTIONS)) {
            optionShadow[key] = option.default;
        }

        optionShadow.resetData = true;
        chrome.storage.local.set({[OPTION_KEY]: optionShadow});
        window.close();
    }

    const button = document.getElementById("resetDataButton");
    button.addEventListener("click", () => {
        if (button.classList.contains("verify")) {
            secondClick(button);
        } else {
            firstClick(button);
        }
    });
}

function addDependencies() {
    // option to use 24 hour time depends on showing the full date
    const showFullDateCheck = document.querySelector("#showFullDateCheck");
    const use24HourCheck = document.querySelector("#use24HourCheck");
    showFullDateCheck.addEventListener("change", () => {
        use24HourCheck.disabled = !showFullDateCheck.checked;
    });

    if (!showFullDateCheck.checked) {
        use24HourCheck.disabled = true;
    }

    // option to highlight recent comments depends on highlighting comments
    const highlightNewCheck = document.querySelector("#highlightNewCheck");
    highlightNewCheck.addEventListener("change", () => {
        if (!highlightNewCheck.checked) {
            document.querySelector("#newTimeNumber").disabled = true;
            document.querySelector("#newTimeSelect").disabled = true;
        } else {
            document.querySelector("#newTimeNumber").disabled = false;
            document.querySelector("#newTimeSelect").disabled = false;
        }
    });

    if (!highlightNewCheck.checked) {
        document.querySelector("#newTimeNumber").disabled = true;
        document.querySelector("#newTimeSelect").disabled = true;
    }

    // keyboard shortcuts depend on having them enabled
    const shortcutsCheck = document.querySelector("#allowKeyboardShortcutsCheck");
    shortcutsCheck.addEventListener("change", () => {
        if (!shortcutsCheck.checked) {
            document.querySelector("#jumpCommentsKeyText").disabled = true;
            document.querySelector("#prevCommentKeyText").disabled = true;
            document.querySelector("#nextCommentKeyText").disabled = true;
            document.querySelector("#prevUnreadKeyText").disabled = true;
            document.querySelector("#nextUnreadKeyText").disabled = true;
            document.querySelector("#parentKeyText").disabled = true;
        } else {
            document.querySelector("#jumpCommentsKeyText").disabled = false;
            document.querySelector("#prevCommentKeyText").disabled = false;
            document.querySelector("#nextCommentKeyText").disabled = false;
            document.querySelector("#prevUnreadKeyText").disabled = false;
            document.querySelector("#nextUnreadKeyText").disabled = false;
            document.querySelector("#parentKeyText").disabled = false;
        }
    });

    if (!shortcutsCheck.checked) {
        document.querySelector("#jumpCommentsKeyText").disabled = true;
        document.querySelector("#prevCommentKeyText").disabled = true;
        document.querySelector("#nextCommentKeyText").disabled = true;
        document.querySelector("#prevUnreadKeyText").disabled = true;
        document.querySelector("#nextUnreadKeyText").disabled = true;
        document.querySelector("#parentKeyText").disabled = true;
    }

    document.body.addEventListener("click", (event) => {
        const a = event.target.closest("a");
        if (a) {
            chrome.tabs.create({url: a.href});
            event.preventDefault();
        }
    });

    // dark mode option
    const darkModeCheck = document.querySelector("#darkModeCheck");
    darkModeCheck.addEventListener("change", () => {
        document.body.classList.toggle("dark", darkModeCheck.checked);
    });

    if (!darkModeCheck.checked) {
        document.body.classList.remove("dark");
    }

    const shortcutToggle = document.getElementById("shortcutToggle");
    shortcutToggle.addEventListener("click", () => {
        const holder = document.getElementById("shortcutHolder");
        const caret = document.getElementById("shortcutToggleCaret");
        const text = document.getElementById("shortcutToggleText");
        if (shortcutToggle.classList.contains("open")) {
            holder.classList.add("closed");
            shortcutToggle.classList.remove("open");
            caret.style.transform = "rotate(0deg)";
            text.textContent = "Show shortcuts";
        } else {
            holder.classList.remove("closed");
            shortcutToggle.classList.add("open");
            caret.style.transform = "rotate(90deg)";
            text.textContent = "Hide shortcuts";
        }
    });

    const advancedToggle = document.getElementById("advancedToggle");
    advancedToggle.addEventListener("click", () => {
        const holder = document.getElementById("advancedHolder");
        const caret = document.getElementById("advancedToggleCaret");
        const text = document.getElementById("advancedToggleText");
        if (advancedToggle.classList.contains("open")) {
            holder.classList.add("closed");
            advancedToggle.classList.remove("open");
            caret.style.transform = "rotate(0deg)";
            text.textContent = "Show options";
        } else {
            holder.classList.remove("closed");
            advancedToggle.classList.add("open");
            caret.style.transform = "rotate(90deg)";
            text.textContent = "Hide options";
        }
    });
}

function populateVersion() {
    const version = chrome.runtime.getManifest().version;
    document.getElementById("version").textContent = `v${version}`;
}

document.addEventListener("DOMContentLoaded", async () => {
    chrome.runtime.getPlatformInfo()
        .then((platform) => {
            if (platform.os === "android") {
                document.body.classList.add("mobile");
            }
        });

    await loadInitialOptionValues();

    for (const option of document.querySelectorAll(".option")) {
        processOption(option);
    }

    addKeyModal();
    createResetHandler();
    addDependencies();
    populateVersion();

    document.querySelector("#known-issues-link").addEventListener("click", () => {
        window.close();
    });
});
