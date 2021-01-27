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

window.onload = async function() {
    for (let id in OPTIONS) {
        $(`#${id}`).parent().attr("title", OPTIONS[id].hovertext);
        createChangeHandler(id);
        await setInitialState(id);
    };

    addDependencies();
}
