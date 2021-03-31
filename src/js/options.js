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
//     onStart: function(value) { ... },
//     onPageChange: function() { ... },
//     onLoad: function() { ... },
//     onCommentChange: function(comment) { ... },
//     onMutation: function(mutation) { ... },
//     onValueChange: function(value) { ... },
// }
//
//  first load   +-----------+  onStart() finishes   +----------------+
// ------------> | onStart() | --------------------> | onPageChange() |
//               +-----------+                       +----------------+
//                                                         |    ^
//                                                     DOM |    |
//                                                   loads |    | on dynamic
//                                                         |    | page load
//                                                         v    |
//                                                 +--------------------+
//                                                 |      onLoad()      | ------------>
//                                                 | (end of page load) |  leave page
//                                                 +--------------------+
//
// function        | run condition                            | args                    | idempotent
// ----------------+------------------------------------------+-------------------------+-----------
// onStart         | once, when the extension is first loaded | none                    | n/a
// onPageChange    | on each page/post change                 | none                    | n/a
// onLoad          | on each page once the DOM is loaded      | none                    | n/a
//                 |                                          |                         |
// onCommentChange | when a new comment is added              | the new comment         | yes
// onMutation      | when a mutation happens on the page      | the mutation            | no
// onValueChange   | when the value of the option changes     | new value, if first run | yes

let fixHeaderOption = {
    key: "fixHeader",
    default: true,
    hovertext: "Keep the header fixed, so it doesn't keep appearing when scrolling up",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
    },
}

let useOldStylingOption = {
    key: "useOldStyling",
    default: false,
    hovertext: "Use styling similar to the old blog",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
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
    onStart: function(value) {
        addStyle(this.key);
        $(`#${this.key}-css`).prop("disabled", !value);
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
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
        if (value) {
            let that = this;
            $("#main").find(".post-preview").each(function() {
                that.processPost(this);
            });
        }
    },
}

let darkModeOption = {
    key: "darkMode",
    default: window.matchMedia("(prefers-color-scheme: dark)").matches,
    hovertext: "Make this popup dark mode (does not apply to page). To make the page dark, use an extension like Dark Reader.",
}

let showHeartsOption = {
    key: "showHearts",
    default: false,
    hovertext: "Add hearts back to comments. Only people using this extension will be able to heart comments or see them, so they won't have the activity they did before.",
    heartHtml: function(hearts, userReact) {
        return `
            <span class="comment-heart">
                <a href="javascript:void(0)" class="like-button ${userReact ? "liked" : ""}">
                    <svg role="img" width="15" height="20" viewBox="0 0 15 20" fill="none" stroke-width="1" stroke="#000" xmlns="http://www.w3.org/2000/svg">
                        <g>
                            <title></title>
                            <path d="M1.73624 5.1145C2.43974 4.37137 3.37095 4 4.3036 4C5.23626 4 6.16745 4.37137
                            6.87097 5.1145L7.49949 5.77892L8.1227 5.11986C9.52973 3.63357 11.8557 3.6336 13.2627
                            5.11986C14.6698 6.60612 14.6698 8.98642 13.2627 10.4727C11.4639 12.3728 9.66583 14.2737
                            7.86703 16.1738C7.81927 16.2242 7.76183 16.2643 7.6982 16.2918C7.63456 16.3192 7.56606
                            16.3333 7.49683 16.3333C7.42761 16.3333 7.3591 16.3192 7.29547 16.2918C7.23184 16.2643
                            7.1744 16.2242 7.12664 16.1738L5.77904 14.7472L3.08384 11.8939L1.73624 10.4673C0.331003
                            8.98011 0.329213 6.60074 1.73624 5.1145Z" stroke="#999999"></path>
                        </g>
                    </svg>
                    <span class="heart-count">
                        ${hearts > 0 ? hearts : ""}
                    </span>
                </a>
            </span>
        `;
    },
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);

        $(document.body).on("click", ".like-button", function() {
            debug("funcs_showHearts.onClick", "showHearts.onClick()");
            let comment = $(this).closest(".comment");
            let commentId = getCommentIdNumber(comment);

            let hearts = commentIdToInfo[commentId]?.hearts;
            hearts = hearts ? hearts : 0;
            let userReact = !!commentIdToInfo[commentId]?.userReact;

            let method;
            if (!userReact) {
                method = "POST";
                hearts++;
            } else {
                method = "DELETE";
                hearts--;
            }

            $(this).toggleClass("liked");
            userReact = !userReact;

            comment.find("> .comment-content .heart-count").text(hearts ? hearts : "");
            if (commentIdToInfo[commentId]) {
                commentIdToInfo[commentId].hearts = hearts;
                commentIdToInfo[commentId].userReact = userReact;
            }

            let url = `https://astralcodexten.substack.com/api/v1/comment/${commentId}/reaction`;
            let data = {reaction: "❤"};
            ajaxRequest(url, data, method, "text");
        });
    },
    onCommentChange: function(comment) {
        let commentId = getCommentIdNumber(comment);
        let hearts = commentIdToInfo[commentId]?.hearts;
        let userReact = commentIdToInfo[commentId]?.userReact;
        let deleted = commentIdToInfo[commentId]?.deleted;

        if (!deleted) {
            let actions = $(comment).find("> .comment-content .comment-actions");
            let existingHeart = actions.find(".comment-heart");
            if (existingHeart.length === 0) {
                actions.prepend(this.heartHtml(hearts, userReact));
            }
        }
    },
    onMutation: function(mutation) {
        if (mutation.target.nodeName.toLowerCase() !== "td") {
            return;
        }

        for (let i = 0; i < mutation.addedNodes.length; i++) {
            let node = mutation.addedNodes[i];
            if (node.classList.contains("comment-actions")) {
                this.onCommentChange($(node).closest(".comment"));
            }
        }
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", value);
        if (value) {
            processAllComments();
        }
    },
}

let showFullDateOption = {
    key: "showFullDate",
    default: true,
    hovertext: "Show the full date and time when a comment was posted",
    onStart: function(value) {
        addStyle(this.key);
        $(`#${this.key}-css`).prop("disabled", !value);
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
        if (dateSpan.find(".better-date:not(.incomplete)").length !== 0) {
            return;
        }

        let origDate = dateSpan.children(":first");
        origDate.addClass("worse-date");

        let newDateIncomplete = dateSpan.find(".better-date.incomplete");
        let newDateDisplay = newDateIncomplete.length > 0 ? newDateIncomplete : origDate.clone();
        newDateDisplay.addClass("better-date incomplete");
        origDate.after(newDateDisplay);

        if (commentId in commentIdToInfo) {
            let utcTime = commentIdToInfo[commentId].date;
            let date = new Date(utcTime);
            newDateDisplay.html(getLocalDateString(date));
            newDateDisplay.removeClass("incomplete");
        }
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
        if (value) {
            processAllComments();
        }
    },
}

let use24HourOption = {
    key: "use24Hour",
    default: false,
    hovertext: "Use 24 hour time for the full date",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
    },
}

let highlightNewOption = {
    key: "highlightNew",
    default: true,
    hovertext: "Highlight comments that you haven't seen yet",
    startSaveTimer: function() {
        if (this.localStorageTimer) {
            clearTimeout(this.localStorageTimer);
        }

        let that = this;
        this.localStorageTimer = setTimeout(function() {
            let postName = getPostName();
            localStorageData[postName].seenComments = Array.from(that.seenCommentsSet);
            saveLocalStorage();
        }, 500);
    },
    ensureSeenComments: function() {
        ensurePostEntry();
        let postName = getPostName();
        if (!("seenComments" in localStorageData[postName])) {
            localStorageData[postName].seenComments = [];
        }
        this.startSaveTimer();
    },
    updateNewTime: function(value) {
        // the delta is in milliseconds
        let newCommentDelta = value;
        let newCommentDate = new Date(new Date().getTime() - newCommentDelta);

        this.newCommentDate = newCommentDate;
    },
    onStart: function(value) {
        if (value) {
            $(document.documentElement).addClass("highlight-new");
        } else {
            $(document.documentElement).removeClass("highlight-new");
        }
    },
    onPageChange: function() {
        this.ensureSeenComments();
        let postName = getPostName();
        this.seenCommentsSet = new Set(localStorageData[postName].seenComments);
        this.pageSeenCommentsSet = new Set();
        this.localStorageTimer = null;
    },
    onCommentChange: function(comment) {
        let commentId = getCommentIdNumber(comment);
        let commentDate = new Date(commentIdToInfo[commentId]?.date);
        let commentSeen = this.seenCommentsSet.has(commentId) && !this.pageSeenCommentsSet.has(commentId);

        this.seenCommentsSet.add(commentId);
        if (!commentSeen) {
            this.pageSeenCommentsSet.add(commentId);
        }
        this.startSaveTimer();

        if (!optionShadow[this.key]) {
            return;
        }

        if ((!commentSeen || commentDate > this.newCommentDate) && optionShadow[this.key]) {
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
            dateSpan.find(".new-tag-text").remove();
            dateSpan.find(".new-tag-css").remove();
        }
    },
    onValueChange: function(value) {
        if (value) {
            $(document.documentElement).addClass("highlight-new");
        } else {
            $(document.documentElement).removeClass("highlight-new");
        }

        processAllComments();
    },
}

let newTimeOption = {
    key: "newTime",
    default: 0,
    hovertext: "Comments posted within this time period will also be marked as new",
    onStart: function(value) {
        OPTIONS.highlightNew.updateNewTime(value);
    },
    onValueChange: function(value) {
        OPTIONS.highlightNew.updateNewTime(value);
        processAllComments();
    },
}

let applyCommentStylingOption = {
    key: "applyCommentStyling",
    default: true,
    hovertext: "Apply basic styling to comments (italics, block quotes, and Markdown style text links)",
    processCommentParagraph: function(innerHtml) {
        let italicRegexStar = /(^|\s|\(|\[|\{|\*)\*((?=[^*\s]).*?(?<=[^*\s]))\*/g;
        let italicRegexUnderscore = /(^|\s|\(|\[|\{|_)_((?=[^_\s]).*?(?<=[^_\s]))_/g;
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
        newHtml = newHtml.replace(italicRegexStar, "$1<i>$2</i>");
        newHtml = newHtml.replace(italicRegexUnderscore, "$1<i>$2</i>");
        newHtml = processBlockquotes(newHtml);
        newHtml = newHtml.replace(linkRegex, `<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>`);

        return newHtml;
    },
    onStart: function(value) {
        addStyle(this.key);
        $(`#${this.key}-css`).prop("disabled", !value);
    },
    onCommentChange: function(comment) {
        let commentBody = $(comment).find("> .comment-content .comment-body");
        let that = this;
        $(commentBody).find("p span").each(function() {
            // only process the text once
            if ($(this).siblings().length === 0) {
                $(this).addClass("old-style");
                let newText = that.processCommentParagraph($(this).html());
                let newSpan = `<span class="new-style">${newText}</span>`;
                $(this).parent().append(newSpan);
            }
        });
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
        if (value) {
            processAllComments();
        }
    },
}

let addParentLinksOption = {
    key: "addParentLinks",
    default: true,
    hovertext: "Add links to scroll to the parent comment, or the top of the comments page for top level comments",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);

        $(document.body).on("click", ".comment-actions > span:last-child", function() {
            debug("funcs_addParentLinks.onClick", "addParentLinks.onClick()");
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
        if (value) {
            processAllComments();
        }
    },
}

let hideBadgeOption = {
    key: "hideBadge",
    default: true,
    hovertext: "Hide the blue circles next to profile pictures",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
    },
}

let loadAllOption = {
    key: "loadAll",
    default: true,
    hovertext: "Load all comments preemptively",
    onLoad: function() {
        let valueChange = this.onValueChange;
        for (let timeout of [0, 500, 1000, 2000]) {
            setTimeout(function() {
                valueChange(optionShadow.loadAll);
            }, timeout);
        }
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
    processButton: function(button) {
        if ($(button).text().includes("new")) {
            $(button).addClass("new-comments");
        }
    },
    onStart: function(value) {
        addStyle(this.key);
        $(`#${this.key}-css`).prop("disabled", !value);
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
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);
        if (value) {
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
    onStart: function(value) {
        addStyle(this.key);
        $(`#${this.key}-css`).prop("disabled", !value);
        this.hiddenSet = new Set(optionShadow[this.key].split(",").map(x => x.trim()).filter(x => x));
    },
    onCommentChange: function(comment) {
        let nameTag = $(comment).find("> .comment-content .comment-meta > span:first-child > a");
        let name = nameTag.text();
        if (this.hiddenSet.has(name)) {
            $(comment).addClass("hidden-post");

            // no visible siblings, so remove the enclosing comment list
            if ($(comment).parent().children(":not(.hidden-post)").length === 0) {
                $(comment).parent().parent().addClass("hidden-post");
            }
        } else {
            $(comment).removeClass("hidden-post");
            $(comment).parent().parent().removeClass("hidden-post");
        }
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).prop("disabled", !value);

        if (value) {
            this.hiddenSet = new Set(optionShadow[this.key].split(",").map(x => x.trim()).filter(x => x));
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
    hovertext: "Key/key combo to jump to the previous comment (click the box to set)",
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
    hovertext: "Key/key combo to jump to the next comment (click the box to set)",
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
    hovertext: "Key/key combo to jump to the previous new comment (click the box to set)",
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
    hovertext: "Key/key combo to jump to the next new comment (click the box to set)",
}

let parentKeyOption = {
    key: "parentKey",
    default: {
        "key": 80,
        "control": false,
        "alt": false,
        "shift": false,
        "meta": false,
    },
    hovertext: "Key/key combo to jump to the parent of the current comment (click the box to set)",
}

let customCssOption = {
    key: "customCss",
    default: "",
    hovertext: "Apply custom css to the page",
    onStart: function(value) {
        let style = $("<style>", {
            "id": `${this.key}-css`,
            "html": value,
        });

        $(document.documentElement).append(style);
    },
    onValueChange: function(value) {
        $(`#${this.key}-css`).html(value);
    },
}

let jsOnStartOption = {
    key: "jsOnStart",
    default: "",
    hovertext: "Run custom JS when the page is first loaded",
    onStart: function(value) {
        try {
            eval(value);
        } catch(e) {
            console.error("onStart error:", e);
        }
    },
}

let jsOnPageChangeOption = {
    key: "jsOnPageChange",
    default: "",
    hovertext: "Run custom JS when a new page is visited",
    onPageChange: function() {
        try {
            eval(optionShadow[this.key]);
        } catch(e) {
            console.error("onPageChange error:", e);
        }
    },
}

let jsOnLoadOption = {
    key: "jsOnLoad",
    default: "",
    hovertext: "Run custom JS when the DOM is loaded",
    onLoad: function() {
        try {
            eval(optionShadow[this.key]);
        } catch(e) {
            console.error("onLoad error:", e);
        }
    },
}

let showDebugOption = {
    key: "showDebug",
    default: "",
    hovertext: "Show matching debugging output in the console (use &ldquo;*&rdquo; for all)",
}

let dynamicLoadOption = {
    key: "dynamicLoad",
    default: false,
    hovertext: "Dynamically load content when switching between posts (default Substack behavior). Enabling can decrease load times, but the comments may appear out of order.",
}

let resetDataOption = {
    key: "resetData",
    default: false,
    hovertext: "Reset all extension data. Use if something breaks that refreshing doesn't fix. Will delete data about which comments have been seen.",
    onStart: function(value) {
        this.onValueChange(optionShadow[this.key]);
    },
    onValueChange: function(value) {
        if (value) {
            window.localStorage.removeItem(LOCAL_DATA_KEY);
            optionShadow.resetData = false;
            webExtension.storage.local.set({[OPTION_KEY]: optionShadow});
        }
    },
}

let hideUpdateNoticeOption = {
    key: "hideUpdateNotice",
    default: false,
}

let optionArray = [
    fixHeaderOption,
    useOldStylingOption,
    hideSubOnlyPostsOption,
    darkModeOption,
    showHeartsOption,
    showFullDateOption,
    use24HourOption,
    highlightNewOption,
    newTimeOption,
    applyCommentStylingOption,
    addParentLinksOption,
    hideBadgeOption,
    loadAllOption,
    hideNewOption,
    hideUsersOption,
    allowKeyboardShortcutsOption,
    smoothScrollOption,
    prevCommentKeyOption,
    nextCommentKeyOption,
    prevUnreadKeyOption,
    nextUnreadKeyOption,
    parentKeyOption,
    customCssOption,
    jsOnStartOption,
    jsOnPageChangeOption,
    jsOnLoadOption,
    showDebugOption,
    dynamicLoadOption,
    resetDataOption,
    hideUpdateNoticeOption,
];

let OPTIONS = {};

for (let option of optionArray) {
    OPTIONS[option.key] = option;
}
