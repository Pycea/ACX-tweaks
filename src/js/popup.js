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



// custom handlers

function newTimeHandler() {
    let units = $("#newTimeSelect").val(); // value is time length in minutes
    let multiplier = $("#newTimeNumber").val();
    let timeMs = units * multiplier * 60 * 1000; // x60000 to turn minutes to ms
    setOption("newTime", timeMs);
}

const CUSTOM_TRIGGERS = {
    "newTime": newTimeHandler,
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

    $("#newTimeSelect").val(selectSetting);
    $("#newTimeNumber").val(numValue);
}

const CUSTOM_SET_STATE = {
    "newTime": newTimeState,
}



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
            tooltip.css("top", `${iconPosition + 11}px`);
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
    let input = $(element).find(".trigger");

    // call custom handler if defined
    if (id in CUSTOM_TRIGGERS) {
        $(input).change(function() {
            CUSTOM_TRIGGERS[id]();
        });

        return;
    }

    // otherwise create default handler
    if ($(input).hasClass("check")) {
        $(input).change(function() {
            setOption(id, $(input).prop("checked"));
        });
    } else if ($(input).hasClass("key")) {
        $(input).focus(async function() {
            this.blur();
            $("#key-input-text").css("display", "inline");
            let keyPress = await getKeyPress();
            setOption(id, keyPress);
            let displayValue = keyDictToString(keyPress);
            $(this).val(displayValue);
            $("#key-input-text").css("display", "none");
        });
    } else if ($(input).hasClass("text")) {
        $(input).change(function() {
            setOption(id, $(input).val());
        });
    }
}

async function setInitialState(element) {
    let id = $(element).attr("id");
    let input = $(element).find(".trigger");
    let setValue = optionShadow[id];

    // call custom state setting function if defined
    if (id in CUSTOM_SET_STATE) {
        CUSTOM_SET_STATE[id](setValue);
        return;
    }

    if ($(input).hasClass("check")) {
        $(input).prop("checked", setValue);
    } else if ($(input).hasClass("key")) {
        let displayValue = keyDictToString(setValue);
        $(input).val(displayValue);
    } else if ($(input).hasClass("text")) {
        $(input).val(setValue);
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

        // reset options to defaults
        for (let key in OPTIONS) {
            optionShadow[key] = OPTIONS[key].default;
        }

        optionShadow.resetData = true;

        webExtension.storage.local.set({[OPTION_KEY]: optionShadow});

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
    // option to use 24 hour time depends on showing the full date
    $("#showFullDateCheck").change(function() {
        if (!this.checked) {
            $("#use24HourCheck").prop("disabled", true).trigger("change");
        } else {
            $("#use24HourCheck").prop("disabled", false);
        }
    });

    if (!($("#showFullDateCheck").prop("checked"))) {
        $("#use24HourCheck").prop("disabled", true);
    }

    // option to highlight recent comments depends on highlighting comments
    $("#highlightNewCheck").change(function() {
        if (!this.checked) {
            $("#newTimeNumber").prop("disabled", true);
            $("#newTimeSelect").prop("disabled", true);
        } else {
            $("#newTimeNumber").prop("disabled", false);
            $("#newTimeSelect").prop("disabled", false);
        }
    });

    if (!($("#highlightNewCheck").prop("checked"))) {
        $("#newTimeNumber").prop("disabled", true);
        $("#newTimeSelect").prop("disabled", true);
    }

    // keyboard shortcuts depend on having them enabled
    $("#allowKeyboardShortcutsCheck").change(function() {
        if (!this.checked) {
            $("#smoothScrollCheck").prop("disabled", true);
            $("#prevCommentKeyText").prop("disabled", true);
            $("#nextCommentKeyText").prop("disabled", true);
            $("#prevUnreadKeyText").prop("disabled", true);
            $("#nextUnreadKeyText").prop("disabled", true);
            $("#parentKeyText").prop("disabled", true);
        } else {
            $("#smoothScrollCheck").prop("disabled", false);
            $("#prevCommentKeyText").prop("disabled", false);
            $("#nextCommentKeyText").prop("disabled", false);
            $("#prevUnreadKeyText").prop("disabled", false);
            $("#nextUnreadKeyText").prop("disabled", false);
            $("#parentKeyText").prop("disabled", false);
        }
    });

    if (!($("#allowKeyboardShortcutsCheck").prop("checked"))) {
        $("#smoothScrollCheck").prop("disabled", true);
        $("#prevCommentKeyText").prop("disabled", true);
        $("#nextCommentKeyText").prop("disabled", true);
        $("#prevUnreadKeyText").prop("disabled", true);
        $("#nextUnreadKeyText").prop("disabled", true);
        $("#parentKeyText").prop("disabled", true);
    }

    // update newTime setting on each keystroke, not just when the value changes
    $("#newTimeNumber").keydown(function(event) {
        if (["+", "-", ".", "e", "E"].includes(event.originalEvent.key)) {
            event.preventDefault();
        }
    });

    $("body").on("click", "a", function() {
        webExtension.tabs.create({url: $(this).attr("href")});
        return false;
   });

    // dark mode option
    $("#darkModeCheck").change(function() {
        if (this.checked) {
            $("body").addClass("dark");
        } else {
            $("body").removeClass("dark");
        }
    });

    if (!($("#darkModeCheck").prop("checked"))) {
        $("body").removeClass("dark");
    }

    $("#shortcutToggle").click(function() {
        if ($(this).hasClass("open")) {
            $("#shortcutHolder").addClass("closed");
            $(this).removeClass("open");
            $("#shortcutToggleCaret").css("transform", "rotate(0deg)");
            $("#shortcutToggleText").text("Show shortcuts");
        } else {
            $("#shortcutHolder").removeClass("closed");
            $(this).addClass("open");
            $("#shortcutToggleCaret").css("transform", "rotate(90deg)");
            $("#shortcutToggleText").text("Hide shortcuts");
        }
    });

    $("#advancedToggle").click(function() {
        if ($(this).hasClass("open")) {
            $("#advancedHolder").addClass("closed");
            $(this).removeClass("open");
            $("#advancedToggleCaret").css("transform", "rotate(0deg)");
            $("#advancedToggleText").text("Show options");
        } else {
            $("#advancedHolder").removeClass("closed");
            $(this).addClass("open");
            $("#advancedToggleCaret").css("transform", "rotate(90deg)");
            $("#advancedToggleText").text("Hide options");
        }
    });
}

function addDebugChecker() {
    let debugChecker = new StringRecognizer("debug");

    document.addEventListener("keydown", function(event) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }

        let checkPassed = debugChecker.nextInput(event.key);
        if (checkPassed) {
            $(".debug").removeClass("debug");
        }
    });
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
    addDebugChecker();
}
