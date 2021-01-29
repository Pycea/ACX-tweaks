"use strict";

// OPTIONS loaded from options.js

let webExtension;
if (typeof browser !== "undefined") {
    webExtension = browser;
} else if (typeof chrome !== "undefined"){
    webExtension = chrome;
} else {
    console.error("What kind of browser do you have anyway? (can't get WebExtension handle)")
}

function addHovertext(id) {
    let iconSvg = webExtension.extension.getURL("icons/question-circle-regular.svg");
    let icon = $(`<img src="${iconSvg}" class="help-icon">`);
    let tooltip = $(`<span class="tooltip" id=${id + "-tooltip"}>${OPTIONS[id].hovertext}<span>`);
    tooltip.css("display", "none");
    $(`#${id}`).parent().append(icon);
    $(`#wrapper`).append(tooltip);

    // yes I know hardcoding is evil. sue me
    let windowHeight = $(window).height();
    let tooltipHeight = tooltip.height() + 12; // 8 to account for margin, plus some space
    let iconPosition = icon.position().top + 7; // element height is 14, 7 is the middle
    let topSpace = iconPosition - tooltipHeight;
    let bottomSpace = (windowHeight - tooltipHeight) - iconPosition;

    if (topSpace > 0 || topSpace >= bottomSpace) {
        tooltip.addClass("top");
    } else {
        tooltip.addClass("bottom");
    }

    $(icon).hover(function() {
        $(tooltip).css("display", "inline");
    }, function() {
        $(tooltip).css("display", "none");
    });
}

function getLocalState(storageId) {
    let storagePromise = new Promise(function(resolve, reject) {
        webExtension.storage.local.get(storageId, function(items) {
            resolve(items);
        });
    });

    return storagePromise;
}

function createChangeHandler(checkId) {
    $(`#${checkId}`).change(function() {
        webExtension.storage.local.set({[checkId]: this.checked});
    });
}

async function setInitialState(id) {
    let value = await getLocalState(id);
    let checkmarkValue = value[id] === undefined ? OPTIONS[id].default : value[id];
    $(`#${id}`).prop("checked", checkmarkValue);
}

function createResetHandler(buttonId) {
    // on the first click, verify intension
    function firstClick(button) {
        let width = button.getBoundingClientRect().width;
        $(button).addClass("verify").html("Are you sure?").css("width", width);
    }

    // on the second click, clear the data
    function secondClick(button) {
        $(button).removeClass("verify").html("Reset all data");
        webExtension.storage.local.set({[buttonId]: true});
        window.close();
    }

    $(`#${buttonId}`).click(function() {
        if ($(this).hasClass("verify")) {
            secondClick(this);
        } else {
            firstClick(this);
        }
    });
}

function addDependencies() {
    $("#loadAll").change(function() {
        if (!this.checked) {
            $("#hideNew").prop("checked", false).prop("disabled", true).trigger("change");
        } else {
            $("#hideNew").prop("disabled", false);
        }
    });

    if (!($("#loadAll").prop("checked"))) {
        $("#hideNew").prop("disabled", true);
    }
}

// make sure the reset option isn't stuck on, otherwise resetting is impossible
async function resetDataFailsafe() {
    let resetDataOption = await getLocalState("resetData");
    if (resetDataOption["resetData"]) {
        webExtension.storage.local.set({["resetData"]: false});
    }
}

window.onload = async function() {
    for (let id in OPTIONS) {
        addHovertext(id);
        createChangeHandler(id);
        await setInitialState(id);
    };

    createResetHandler("resetData");
    addDependencies();
    resetDataFailsafe();
}
