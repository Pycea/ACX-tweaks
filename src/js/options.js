"use strict";

function addStyle(key) {
    let value = STYLES[key];
    let css = value.css;
    let style = $("<style>", {
        "id": `${key}-css`,
        "html": css,
    });

    $(document.documentElement).append(style);
}


// {
//     key: <key>,
//     default: <value>,
//     hovertext: <string>,
//     onStart: function() { ... },
//     onLoad: function() { ... },
//     onCommentChange: function(comment) { ... },
//     onMutation: function(mutation) { ... },
//     onValueChange: function(value, isInitial) { ... },
// }
//
// onCommentChange should be idempotent


let fixHeaderOption = {
    key: "fixHeader",
    default: true,
    hovertext: "Keep the header fixed, so it doesn't keep appearing when scrolling up",
    onStart: function() {
        addStyle(this.key);
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
    },
}

let useOldStylingOption = {
    key: "useOldStyling",
    default: false,
    hovertext: "Use styling similar to the old blog",
    onStart: function() {
        addStyle(this.key);
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
    },
}

let hideSubOnlyPostsOption = {
    key: "hideSubOnlyPosts",
    default: false,
    hovertext: "Hide posts that are subscriber only",
    processPost: function(post) {
        let lock = $(post).find(".audience-lock");
        if (lock.length !== 0) {
            $(post).addClass("sub-post");
        }
    },
    onStart: function() {
        addStyle(this.key);
    },
    onLoad: function() {
        if (optionShadow[this.key]) {
            let processFunc = this.processPost;
            $("#main").find(".post-preview").each(function() {
                processFunc(this);
            });
        }
    },
    onMutation: function(mutation) {
        if (!mutation.target.classList.contains("portable-archive-list") &&
                mutation.target.tagName.toLowerCase() !== "tr") {
            return;
        }

        for (let i = 0; i < mutation.addedNodes.length; i++) {
            let node = mutation.addedNodes[i];
            if (node.classList.contains("post-preview")) {
                this.processPost(node);
            } else if (node.classList.contains("audience-lock")) {
                // for some reason substack caches everything except the lock icon?
                this.processPost($(node).closest(".post-preview"));
            }
        }
    },
    onValueChange: function(value, isInitial) {
        $(`#${this.key}-css`).prop("disabled", !value);
        if (value && !isInitial) {
            let processFunc = this.processPost;
            $("#main").find(".post-preview").each(function() {
                processFunc(this);
            });
        }
    },
}

let hideHeartsOption = {
    key: "hideHearts",
    default: true,
    hovertext: "Hide reactions to comments",
    onStart: function() {
        addStyle(this.key);
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
    },
}

let showFullDateOption = {
    key: "showFullDate",
    default: true,
    hovertext: "Show the full date and time when a comment was posted",
    onStart: function() {
        addStyle(this.key);
    },
    onCommentChange: function(comment) {
        function getLocalDateString(date) {
            let months = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ];

            let year = date.getFullYear();
            let month = months[date.getMonth()];
            let day = date.getDate();
            let hour = date.getHours();
            let minute = date.getMinutes().toString().padStart(2, "0");

            let amPm = hour <= 11 ? "am" : "pm";
            let hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);

            let hour12Html = `<span class="hour12-time">${hour12}:${minute} ${amPm}</span>`;
            let hour24Html = `<span class="hour24-time">${hour}:${minute}</span>`;

            return `${month} ${day}, ${year} at ${hour12Html}${hour24Html}`;
        }

        let commentId = getCommentIdNumber(comment);
        let dateSpan = $(comment).find("> .comment-content .comment-meta > span:nth-child(2)");

        // don't add if the new date element already exists
        if (dateSpan.find(".better-date").length !== 0) {
            return;
        }

        let origDate = dateSpan.children(":first");
        origDate.addClass("worse-date");
        let newDateDisplay = origDate.clone();
        newDateDisplay.addClass("better-date");
        origDate.after(newDateDisplay);

        if (commentId in commentIdToDate) {
            let utcTime = commentIdToDate[commentId];
            let date = new Date(utcTime);
            newDateDisplay.html(getLocalDateString(date));
        }
    },
    onValueChange: function(value, isInitial) {
        $(`#${this.key}-css`).prop("disabled", !value);
        if (value && !isInitial) {
            processAllComments();
        }
    },
}

let use24HourOption = {
    key: "use24Hour",
    default: false,
    hovertext: "Use 24 hour time for the full date",
    onStart: function() {
        addStyle(this.key);
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
    },
}

let highlightNewOption = {
    key: "highlightNew",
    default: true,
    hovertext: "Highlight comments that you haven't seen yet",
    onStart: function() {
        // the delta is in milliseconds
        let newCommentDelta = optionShadow.newTime;
        let newCommentDate = new Date(new Date().getTime() - newCommentDelta);

        // any comments newer than either the last time the post was seen, or the custom delta set, are
        // considered new
        if (lastSeenDate < newCommentDate) {
            this.lastNewDate = lastSeenDate;
        } else {
            this.lastNewDate = newCommentDate;
        }
    },
    onCommentChange: function(comment) {
        function processCommentNew(comment, lastNewDate) {
            let commentId = getCommentIdNumber(comment);
            let commentDate = new Date(commentIdToDate[commentId]);

            if (commentDate > lastNewDate) {
                if (!$(comment).hasClass("new-comment")) {
                    $(comment).addClass("new-comment");
                    let dateSpan = $(comment).find("> .comment-content .comment-meta > span:nth-child(2)");
                    let newTagText = ("<span class='new-tag-text'>~new~</span>");
                    let newTagCss = ("<span class='new-tag-css'></span>");
                    dateSpan.append(newTagText);
                    dateSpan.append(newTagCss);
                }
            } else {
                $(comment).removeClass("new-comment");
                let dateSpan = $(comment).find("> .comment-content .comment-meta > span:nth-child(2)");
                dateSpan.find(".new-tag").remove();
            }
        }

        processCommentNew(comment, this.lastNewDate);
    },
    onValueChange: function(value, isInitial) {
        if (value) {
            $(document.documentElement).addClass("highlight-new");
            if (!isInitial) {
                processAllComments();
            }
        } else {
            $(document.documentElement).removeClass("highlight-new");
        }
    },
}

let newTimeOption = {
    key: "newTime",
    default: 0,
    hovertext: "Comments posted within this time period will also be marked as new",
    onValueChange: function(value, isInitial) {
        if (!isInitial) {
            processAllComments();
        }
    },
}

let addParentLinksOption = {
    key: "addParentLinks",
    default: true,
    hovertext: "Add links to scroll to the parent comment, or the top of the comments page for top level comments",
    onStart: function() {
        addStyle(this.key);

        $("#entry").on("click", ".comment-actions > span:nth-child(2)", function() {
            let comment = $(this).closest(".comment");
            let parentComment = $(comment).parent().closest(".comment");
            let scrollElement;
            if (parentComment.length === 0) {
                // already at top level comment
                scrollElement = $(".comments-page");
            } else {
                scrollElement = parentComment.find("> .comment-anchor:first-child");
            }
            scrollElement[0].scrollIntoView({ "behavior": "smooth" });
        });
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", value);
    },
}

let applyCommentStylingOption = {
    key: "applyCommentStyling",
    default: true,
    hovertext: "Apply basic styling to comments (italics, block quotes, and Markdown style text links)",
    onStart: function() {
        addStyle(this.key);
    },
    onCommentChange: function(comment) {
        function processCommentParagraph(innerHtml) {
            let italicRegex = /(^|\s|\(|\[|\{|\*)\*((?=[^*\s]).*?(?<=[^*\s]))\*/g;
            let blockQuoteRegex = /^(>|&gt;)\s*(.*)$/;
            // yes I'm parsing html with a regex. deal with it
            let linkRegex = /\[(.+?)\]\(<a href="(.*?)".*?<\/a>\)/g;

            function processBlockquotes(text) {
                let reMatch = text.match(blockQuoteRegex);
                if (reMatch) {
                    return `<blockquote>${processBlockquotes(reMatch[2])}</blockquote>`;
                } else {
                    return text;
                }
            }

            let newHtml = innerHtml;
            newHtml = newHtml.replace(italicRegex, "$1<i>$2</i>");
            newHtml = processBlockquotes(newHtml);
            newHtml = newHtml.replace(linkRegex, `<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>`);

            return newHtml;
        }

        let commentBody = $(comment).find("> .comment-content .comment-body");
        $(commentBody).find("p span").each(function() {
            // only process the text once
            if ($(this).siblings().length === 0) {
                $(this).addClass("old-style");
                let newText = processCommentParagraph($(this).html());
                let newSpan = `<span class="new-style">${newText}</span>`;
                $(this).parent().append(newSpan);
            }
        });
    },
    onValueChange: function(value, isInitial) {
        $(`#${this.key}-css`).prop("disabled", !value);
        if (value && !isInitial) {
            processAllComments();
        }
    },
}

let loadAllOption = {
    key: "loadAll",
    default: true,
    hovertext: "Load all comments preemptively",
    onLoad: function() {
        let valueChange = this.onValueChange;
        setTimeout(function() {
            valueChange(optionShadow.loadAll);
        }, 2000);
    },
    onValueChange: function(value) {
        // this is ugliness incarnate, but what else are ya gonna do with substack?
        function recursiveExpand() {
            let expandButtons = $("button.collapsed-reply");
            if (expandButtons.length) {
                expandButtons.click();
                setTimeout(recursiveExpand, 500);
            }
        }

        if (value) {
            recursiveExpand();
        } else {
            // nothing to do once the page is loaded
        }
    },
}

let hideNewOption = {
    key: "hideNew",
    default: false,
    hovertext: "Hide the button that shows when new comments have been added",
    onStart: function() {
        addStyle(this.key);
    },
    processButton: function(button) {
        if ($(button).text().includes("new")) {
            $(button).addClass("new-comments");
        }
    },
    onMutation: function(mutation) {
        if (!mutation.target.classList.contains("collapsed")) {
            return;
        }

        for (let i = 0; i < mutation.addedNodes.length; i++) {
            let node = mutation.addedNodes[i];
            if (node.classList.contains("collapsed-reply")) {
                this.processButton(node);
            }
        }
    },
    onValueChange: function(value, isInitial) {
        $(`#${this.key}-css`).prop("disabled", !value);
        if (value && !isInitial) {
            let processFunc = this.processButton;
            $("#main").find("button.collapsed-reply").each(function() {
                processFunc(this);
            });
        }
    },
}

let hideUsersOption = {
    key: "hideUsers",
    default: "",
    hovertext: "Hide comments from the listed users, in a comma separated list",
    onStart: function() {
        this.hiddenSet = new Set(optionShadow[this.key].split(",").map(x => x.trim()).filter(x => x));
    },
    onCommentChange: function(comment) {
        let nameTag = $(comment).find("> .comment-content .comment-meta > span:first-child > a");
        let name = nameTag.text();
        if (this.hiddenSet.has(name)) {
            $(comment).addClass("hiddenPost");

            // no siblings, so remove the enclosing comment list
            if ($(comment).parent().children().length === 1) {
                $(comment).parent().parent().addClass("hiddenPost");
            }
        } else {
            $(comment).removeClass("hiddenPost");
            $(comment).parent().parent().removeClass("hiddenPost");
        }
    },
    onValueChange: function(value, isInitial) {
        this.hiddenSet = new Set(optionShadow[this.key].split(",").map(x => x.trim()).filter(x => x));
        if (value && !isInitial) {
            processAllComments();
        }
    },
}

let allowKeyboardShortcutsOption = {
    key: "allowKeyboardShortcuts",
    default: true,
    hovertext: "Enable keyboard shortcuts for the various actions below",
}

let smoothScrollOption = {
    key: "smoothScroll",
    default: true,
    hovertext: "Smoothly scroll when moving between comments (disable this to jump directly to the next comment)",
}

let prevCommentKeyOption = {
    key: "prevCommentKey",
    default: {
        "key": 73,
        "control": false,
        "alt": false,
        "shift": false,
        "meta": false,
    },
    hovertext: "Key/key combo to move to the previous comment (click the box to set)",
}

let nextCommentKeyOption = {
    key: "nextCommentKey",
    default: {
        "key": 85,
        "control": false,
        "alt": false,
        "shift": false,
        "meta": false,
    },
    hovertext: "Key/key combo to move to the next comment (click the box to set)",
}

let prevUnreadKeyOption = {
    key: "prevUnreadKey",
    default: {
        "key": 75,
        "control": false,
        "alt": false,
        "shift": false,
        "meta": false,
    },
    hovertext: "Key/key combo to move to the previous new comment (click the box to set)",
}

let nextUnreadKeyOption = {
    key: "nextUnreadKey",
    default: {
        "key": 74,
        "control": false,
        "alt": false,
        "shift": false,
        "meta": false,
    },
    hovertext: "Key/key combo to move to the next new comment (click the box to set)",
}

let dynamicLoadOption = {
    key: "dynamicLoad",
    default: false,
    hovertext: "Dynamically load content when switching between posts (default Substack behavior). Enabling can decrease load times, but may break some functionality.",
}

let resetDataOption = {
    key: "resetData",
    default: false,
    hovertext: "Reset all extension data. Use if something breaks that refreshing doesn't fix. Will delete data about which comments have been seen.",
}

let optionArray = [
    fixHeaderOption,
    useOldStylingOption,
    hideSubOnlyPostsOption,
    hideHeartsOption,
    showFullDateOption,
    use24HourOption,
    highlightNewOption,
    newTimeOption,
    addParentLinksOption,
    applyCommentStylingOption,
    loadAllOption,
    hideNewOption,
    hideUsersOption,
    allowKeyboardShortcutsOption,
    smoothScrollOption,
    prevCommentKeyOption,
    nextCommentKeyOption,
    prevUnreadKeyOption,
    nextUnreadKeyOption,
    dynamicLoadOption,
    resetDataOption,
]

// Script loaded:
//     run onStart
//     run onValueChange with option value
// Page loaded:
//     run onLoad
// When comment added:
//     run onCommentChange with comment
// When option change:
//     run onValueChange with new value

let OPTIONS = {};

for (let option of optionArray) {
    OPTIONS[option.key] = option;
}
