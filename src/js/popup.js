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

// function newTimeHandler() {
//     // value is time length in minutes
//     const units = document.getElementById("newTimeSelect").value;
//     const multiplier = document.getElementById("newTimeSelect").value;
//     const timeMs = units * multiplier * 60 * 1000; // x60000 to turn minutes to ms
//     setOption("newTime", timeMs);
// }

const CUSTOM_TRIGGERS = {
    // "newTime": newTimeHandler,
}

// function newTimeState(value) {
//     // value is in milliseconds

//     // numValue is the numerical part of the setting, without the units
//     // start out with minutes
//     let numValue = value / 1000 / 60;

//     // the value of the select is the number of minutes for the given time
//     let selectSetting = 1;

//     // if it's an even number of hours, use those instead
//     if (numValue % 60 === 0) {
//         numValue /= 60;
//         selectSetting *= 60;
//     }

//     // if it's an even number of days, use those instead
//     if (numValue % 24 === 0) {
//         numValue /= 24;
//         selectSetting *= 24;
//     }

//     $("#newTimeSelect").val(selectSetting);
//     $("#newTimeNumber").val(numValue);
// }

const CUSTOM_SET_STATE = {
    // "newTime": newTimeState,
}




function addHovertext(optionElem) {
    const id = optionElem.id;
    const iconSvg = chrome.runtime.getURL("icons/question-circle-regular.svg");
    const icon = document.createElement("img");
    icon.src = iconSvg;
    icon.className = "help-icon";
    const tooltip = document.createElement("span");
    tooltip.id = `${id}-tooltip`;
    tooltip.className = "tooltip";
    tooltip.textContent = OPTIONS[id].hovertext;
    tooltip.style.display = "none";
    optionElem.appendChild(icon);
    document.getElementById("wrapper").appendChild(tooltip);

    icon.addEventListener("mouseenter", () => {
        tooltip.style.display = "block";
        const windowHeight = window.innerHeight;
        const iconSpace = 15;
        const tooltipHeight = tooltip.getBoundingClientRect().height + 2 * iconSpace;
        // icon height is 14, 7 is the middle
        const iconPosition = icon.getBoundingClientRect().top + 7;
        const topSpace = iconPosition - tooltipHeight;
        const bottomSpace = (windowHeight - tooltipHeight) - iconPosition;

        if (topSpace > 8) {
            tooltip.style.top = `${iconPosition - tooltipHeight}px`;
        } else if (bottomSpace > 8) {
            tooltip.style.top = `${iconPosition + 11}px`;
        } else {
            tooltip.style.top = "8px";
        }
    });

    icon.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
    });
}

function createChangeHandler(optionElem) {
    const id = optionElem.id;
    const input = optionElem.querySelector(".trigger");

    // call custom handler if defined
    if (id in CUSTOM_TRIGGERS) {
        input.addEventListener("change", CUSTOM_TRIGGERS[id]);
        return;
    }

    // otherwise create default handler
    if (input.classList.contains("check")) {
        input.addEventListener("change", () => setOption(id, input.checked));
    } else if (input.classList.contains("key")) {
        input.addEventListener("focus", async () => {
            this.blur();
            document.getElementById("key-input-text").style.display = "inline";
            const keyPress = await getKeyPress();
            setOption(id, keyPress);
            const displayValue = keyDictToString(keyPress);
            input.value = displayValue;
            document.getElementById("key-input-text").style.display = "none";
        });
    } else if (input.classList.contains("text")) {
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
    const modal = document.createElement("span");
    modal.id = "key-input-text";
    modal.classList.add("tooltip", "center");
    modal.textContent = "Press a key or key combo, or click anywhere to disable";
    modal.style.display = "none";
    document.getElementById("wrapper").appendChild(modal);
}

function createResetHandler() {
    // on the first click, verify intension
    function firstClick(button) {
        const width = button.getBoundingClientRect().width;
        button.classList.add("verify");
        button.textContent = "Are you sure?";
        button.style.width = width;
    }

    // on the second click, clear the data
    function secondClick(button) {
        button.classList.removeClass("verify");
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
//     // option to use 24 hour time depends on showing the full date
//     $("#showFullDateCheck").change(function() {
//         if (!this.checked) {
//             $("#use24HourCheck").prop("disabled", true).trigger("change");
//         } else {
//             $("#use24HourCheck").prop("disabled", false);
//         }
//     });

//     if (!($("#showFullDateCheck").prop("checked"))) {
//         $("#use24HourCheck").prop("disabled", true);
//     }

//     // option to highlight recent comments depends on highlighting comments
//     $("#highlightNewCheck").change(function() {
//         if (!this.checked) {
//             $("#newTimeNumber").prop("disabled", true);
//             $("#newTimeSelect").prop("disabled", true);
//         } else {
//             $("#newTimeNumber").prop("disabled", false);
//             $("#newTimeSelect").prop("disabled", false);
//         }
//     });

//     if (!($("#highlightNewCheck").prop("checked"))) {
//         $("#newTimeNumber").prop("disabled", true);
//         $("#newTimeSelect").prop("disabled", true);
//     }

//     // keyboard shortcuts depend on having them enabled
//     $("#allowKeyboardShortcutsCheck").change(function() {
//         if (!this.checked) {
//             $("#smoothScrollCheck").prop("disabled", true);
//             $("#prevCommentKeyText").prop("disabled", true);
//             $("#nextCommentKeyText").prop("disabled", true);
//             $("#prevUnreadKeyText").prop("disabled", true);
//             $("#nextUnreadKeyText").prop("disabled", true);
//             $("#parentKeyText").prop("disabled", true);
//         } else {
//             $("#smoothScrollCheck").prop("disabled", false);
//             $("#prevCommentKeyText").prop("disabled", false);
//             $("#nextCommentKeyText").prop("disabled", false);
//             $("#prevUnreadKeyText").prop("disabled", false);
//             $("#nextUnreadKeyText").prop("disabled", false);
//             $("#parentKeyText").prop("disabled", false);
//         }
//     });

//     if (!($("#allowKeyboardShortcutsCheck").prop("checked"))) {
//         $("#smoothScrollCheck").prop("disabled", true);
//         $("#prevCommentKeyText").prop("disabled", true);
//         $("#nextCommentKeyText").prop("disabled", true);
//         $("#prevUnreadKeyText").prop("disabled", true);
//         $("#nextUnreadKeyText").prop("disabled", true);
//         $("#parentKeyText").prop("disabled", true);
//     }

//     // update newTime setting on each keystroke, not just when the value changes
//     $("#newTimeNumber").keydown(function(event) {
//         if (["+", "-", ".", "e", "E"].includes(event.originalEvent.key)) {
//             event.preventDefault();
//         }
//     });

//     $("body").on("click", "a", function() {
//         chrome.tabs.create({url: $(this).attr("href")});
//         return false;
//    });

//     // dark mode option
//     $("#darkModeCheck").change(function() {
//         if (this.checked) {
//             $("body").addClass("dark");
//         } else {
//             $("body").removeClass("dark");
//         }
//     });

//     if (!($("#darkModeCheck").prop("checked"))) {
//         $("body").removeClass("dark");
//     }

//     $("#shortcutToggle").click(function() {
//         if ($(this).hasClass("open")) {
//             $("#shortcutHolder").addClass("closed");
//             $(this).removeClass("open");
//             $("#shortcutToggleCaret").css("transform", "rotate(0deg)");
//             $("#shortcutToggleText").text("Show shortcuts");
//         } else {
//             $("#shortcutHolder").removeClass("closed");
//             $(this).addClass("open");
//             $("#shortcutToggleCaret").css("transform", "rotate(90deg)");
//             $("#shortcutToggleText").text("Hide shortcuts");
//         }
//     });

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
    await loadInitialOptionValues();

    for (const option of document.querySelectorAll(".option")) {
        processOption(option);
    }

    addKeyModal();
    createResetHandler();
    addDependencies();
    populateVersion();
});
