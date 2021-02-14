"use strict";

// OPTIONS loaded from options.js

let webExtension;
if (typeof browser !== "undefined") {
    webExtension = browser;
} else if (typeof chrome !== "undefined"){
    webExtension = chrome;
} else {
    console.error("What kind of browser do you have anyway? (can't get WebExtension handle)");
}

// cache of the current options
let optionShadow;



function setOption(key, value) {
    optionShadow[key] = value;
    webExtension.storage.local.set({[OPTION_KEY]: optionShadow});
}

async function loadInitialOptionValues() {
    optionShadow = await getLocalState(OPTION_KEY);
    if (!optionShadow) {
        optionShadow = {};
    }

    for (let key in OPTIONS) {
        if (optionShadow[key] === undefined) {
            optionShadow[key] = OPTIONS[key].default;
        }
    }
}

function addHovertext(element) {
    let id = $(element).attr("id");
    let iconSvg = webExtension.extension.getURL("icons/question-circle-regular.svg");
    let icon = $(`<img src="${iconSvg}" class="help-icon">`);
    let tooltip = $(`<span class="tooltip" id=${id + "-tooltip"}>${OPTIONS[id].hovertext}<span>`);
    tooltip.css("display", "none");
    $(element).append(icon);
    $(`#wrapper`).append(tooltip);

    $(icon).hover(function() {
        let windowHeight = $(window).height();
        // magic offset because ???
        let tooltipHeight = tooltip.height() + 30;
        let iconPosition = this.getBoundingClientRect().top + 7; // element height is 14, 7 is the middle
        let topSpace = iconPosition - tooltipHeight;
        let bottomSpace = (windowHeight - tooltipHeight) - iconPosition;

        if (topSpace > 8) {
            tooltip.css("top", `${iconPosition - tooltipHeight}px`);
        } else if (bottomSpace > 8) {
            tooltip.css("top", `${iconPosition + 11}px`)
        } else {
            tooltip.css("top", `8px`);
        }

        $(tooltip).css("display", "inline");
    }, function() {
        $(tooltip).css("display", "none");
    });
}

function createChangeHandler(element) {
    let id = $(element).attr("id");
    let input = $(element).find("input");

    if ($(input).attr("type") === "checkbox") {
        $(input).change(function() {
            setOption(id, $(input).prop("checked"));
        });
    } else if ($(input).attr("type") === "text") {
        $(input).focus(async function() {
            this.blur();
            $("#key-input-text").css("display", "inline");
            let keyPress = await getKeyPress();
            setOption(id, keyPress);
            let displayValue = keyDictToString(keyPress);
            $(this).val(displayValue);
            $("#key-input-text").css("display", "none");
        });
    }
}

async function setInitialState(element) {
    let id = $(element).attr("id");
    let input = $(element).find("input");
    let setValue = optionShadow[id];

    if ($(input).attr("type") === "checkbox") {
        $(input).prop("checked", setValue);
    } else if ($(input).attr("type") === "text") {
        let displayValue = keyDictToString(setValue);
        $(input).val(displayValue);
    }
}

async function processOption(element) {
    addHovertext(element);
    createChangeHandler(element);
    await setInitialState(element);
}

function addKeyModal() {
    let modal = $(`<span class="tooltip" id="key-input-text">Press a key or key combo, or click anywhere to disable<span>`);
    modal.css("display", "none");
    modal.addClass("center");
    $(`#wrapper`).append(modal);
}

function createResetHandler() {
    // on the first click, verify intension
    function firstClick(button) {
        let width = button.getBoundingClientRect().width;
        $(button).addClass("verify").html("Are you sure?").css("width", width);
    }

    // on the second click, clear the data
    function secondClick(button) {
        $(button).removeClass("verify").html("Reset all data");
        setOption("resetData", true);
        window.close();
    }

    $(`#resetDataButton`).click(function() {
        if ($(this).hasClass("verify")) {
            secondClick(this);
        } else {
            firstClick(this);
        }
    });
}

function addDependencies() {
    $("#showFullDateCheck").change(function() {
        if (!this.checked) {
            $("#use24HourCheck").prop("checked", false).prop("disabled", true).trigger("change");
        } else {
            $("#use24HourCheck").prop("disabled", false);
        }
    });

    if (!($("#showFullDateCheck").prop("checked"))) {
        $("#use24HourCheck").prop("disabled", true);
    }

    $("#loadAllCheck").change(function() {
        if (!this.checked) {
            $("#hideNewCheck").prop("checked", false).prop("disabled", true).trigger("change");
        } else {
            $("#hideNewCheck").prop("disabled", false);
        }
    });

    if (!($("#loadAllCheck").prop("checked"))) {
        $("#hideNewCheck").prop("disabled", true);
    }

    $("#allowKeyboardShortcutsCheck").change(function() {
        if (!this.checked) {
            $("#smoothScrollCheck").prop("disabled", true);
            $("#prevCommentKeyText").prop("disabled", true);
            $("#nextCommentKeyText").prop("disabled", true);
            $("#prevUnreadKeyText").prop("disabled", true);
            $("#nextUnreadKeyText").prop("disabled", true);
        } else {
            $("#smoothScrollCheck").prop("disabled", false);
            $("#prevCommentKeyText").prop("disabled", false);
            $("#nextCommentKeyText").prop("disabled", false);
            $("#prevUnreadKeyText").prop("disabled", false);
            $("#nextUnreadKeyText").prop("disabled", false);
        }
    });

    if (!($("#allowKeyboardShortcutsCheck").prop("checked"))) {
        $("#smoothScrollCheck").prop("disabled", true);
        $("#prevCommentKeyText").prop("disabled", true);
        $("#nextCommentKeyText").prop("disabled", true);
        $("#prevUnreadKeyText").prop("disabled", true);
        $("#nextUnreadKeyText").prop("disabled", true);
    }
}

// make sure the reset option isn't stuck on, otherwise resetting is impossible
async function resetDataFailsafe() {
    let resetDataOption = await getLocalState("resetData");
    if (resetDataOption) {
        setOption("resetData", false);
    }
}

window.onload = async function() {
    await loadInitialOptionValues();

    let promiseArray = [];
    for (let option of $(".option")) {
        promiseArray.push(processOption(option));
    }

    await Promise.all(promiseArray);

    addKeyModal();
    createResetHandler();
    addDependencies();
    resetDataFailsafe();
}
