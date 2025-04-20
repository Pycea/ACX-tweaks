"use strict";

const OPTION_KEY = "options";

function cssId(key) {
    return `${key}-css`;
}

function addStyle(key) {
    const value = STYLES[key];
    const css = value.css;
    const style = document.createElement("style");
    style.id = cssId(key);
    style.textContent = css;
    document.documentElement.appendChild(style);
}



// {
//     key: <key>,
//     default: <value>,
//     hovertext: <string>,
//     onStart: function(value) { ... },
//     onLoad: function() { ... },
//     processComment: function(comment) { ... },
//     onValueChange: function(value) { ... },
// }
//
// Run order on page load:
//     onStart() handlers
//     processAllComments()
//         processComment() handlers for any existing comments
//     onLoad() handlers

const fixHeaderOption = {
    key: "fixHeader",
    default: true,
    hovertext: "Keep the header fixed, so it doesn't keep appearing when scrolling up",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
    },
}
/*
const useOldStylingOption = {
    key: "useOldStyling",
    default: false,
    hovertext: "Use styling similar to the old blog Slate Star Codex",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
    },
}

const darkModeOption = {
    key: "darkMode",
    default: window.matchMedia("(prefers-color-scheme: dark)").matches,
    hovertext: "Make this popup dark mode (does not apply to blog itself). To make the page dark, use an extension like Dark Reader.",
}
*/
const zenModeOption = {
    key: "zenMode",
    default: false,
    hovertext: "Remove like, share, and subscribe clutter (use separate option below to disable comments)",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
    },
}
/*
const removeCommentsOption = {
    key: "removeComments",
    default: false,
    hovertext: "Completely remove the comments section from posts",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
    },
}

let showHeartsOption = {
    key: "showHearts",
    default: false,
    hovertext: "Add hearts back to comments. Only people using an extension that adds back hearts will be able to like comments or see them, so they won't have the activity they did before.",
    heartContainer: $(
        `<div class="reaction-container">
            <svg role="img" width="24" height="24" viewBox="0 0 24 24" fill="#000000" stroke-width="1" stroke="#000" xmlns="http://www.w3.org/2000/svg" class="animation">
                <g>
                    <title></title>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart">
                        <path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                    </svg>
                </g>
            </svg>
            <svg role="img" width="14" height="14" viewBox="0 0 24 24" fill="transparent" stroke-width="1.5" stroke="#757575" xmlns="http://www.w3.org/2000/svg" style="height: 14px; width: 14px;">
                <g>
                    <title></title>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="transparent" stroke="#757575" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart">
                        <path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                    </svg>
                </g>
            </svg>
            <span class="like-count"></span>
        </div>`
    ),
    heartHtml: function(hearts, userReact, ownComment) {
        let heartContainer = this.heartContainer[0].cloneNode(true);
        heartContainer.getElementsByClassName("like-count")[0].textContent = hearts > 0 ? hearts : "";

        // <span class="comment-heart">
        //     <a class="like-button ${userReact ? "liked" : ""} ${ownComment ? "own-comment" : ""}">
        //         ${heartContainer}
        //     </a>
        // </span>
        let outer = document.createElement("span");
        outer.classList.add("comment-heart");
        let link = document.createElement("a");
        link.classList.add("like-button");
        if (userReact) link.classList.add("liked");
        if (ownComment) link.classList.add("own-comment");
        link.appendChild(heartContainer);
        outer.appendChild(link);
        return outer;
    },
    updateUserId: function() {
        if (!this.userId) {
            let userId = $("input[name=user_id]").val();
            this.userId = userId ? parseInt(userId) : undefined;
            debug("funcs_showHearts.updateUserId", "showHearts.updateUserId()", `userId=${this.userId}`);
        }
    },
    onStart: function(value) {
        addStyle(this.key);
        $(`#${this.key}-css`).prop("disabled", value);
        this.updateUserId();

        let that = this;
        $(document).on("click", ".like-button", function() {
            debug("funcs_showHearts.onClick", "showHearts.onClick()");
            that.updateUserId();
            let comment = $(this).closest(".comment");
            let commentId = getCommentIdNumber(comment);

            // no liking your own comments
            let userId = commentIdToInfo[commentId]?.userId;
            if (userId === that.userId) {
                return;
            }

            let hearts = commentIdToInfo[commentId]?.hearts;
            hearts = hearts ? hearts : 0;
            let userReact = !!commentIdToInfo[commentId]?.userReact;

            let method;
            if (!userReact) {
                debug("funcs_showHearts.onClick", "liking comment and increasing like count");
                method = "POST";
                hearts++;
            } else {
                debug("funcs_showHearts.onClick", "unliking comment and decreasing like count");
                method = "DELETE";
                hearts--;
            }

            $(this).toggleClass("liked");
            userReact = !userReact;

            comment.find("> .comment-content .like-count").text(hearts ? hearts : "");
            if (commentIdToInfo[commentId]) {
                commentIdToInfo[commentId].hearts = hearts;
                commentIdToInfo[commentId].userReact = userReact;
            }

            let url = `https://www.astralcodexten.com/api/v1/comment/${commentId}/reaction`;
            let data = {reaction: "❤"};
            ajaxRequest(url, data, method, "text");
        });
    },
    onCommentChange: function(comment) {
        if (!commentIdToInfo) {
            return;
        }

        this.updateUserId();
        let commentId = getCommentIdNumber(comment);
        let userId = commentIdToInfo[commentId]?.userId;
        let hearts = commentIdToInfo[commentId]?.hearts;
        let userReact = commentIdToInfo[commentId]?.userReact;
        let deleted = commentIdToInfo[commentId]?.deleted;
        let ownComment = userId === this.userId;

        if (!deleted) {
            let actions = $(comment).find("> .comment-content .comment-actions");
            if (actions.html() !== "") {
                for (const childAction of actions.children()) {
                    let text = $(childAction).text();
                    if (text === "Reply") {
                        $(childAction).addClass("action-reply");
                    } else if (text === "Delete") {
                        $(childAction).addClass("action-delete");
                    }
                }

                let existingHeart = actions.find(".comment-heart");
                existingHeart.remove();
                actions.append(this.heartHtml(hearts, userReact, ownComment));
            }
        } else {
            let actions = $(comment).find("> .comment-content .comment-actions");
            actions.find(".comment-heart").remove();
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
    hovertext: "Show the full date and time when a comment was posted and edited",
    onStart: function(value) {
        addStyle(this.key);
        $(`#${this.key}-css`).prop("disabled", !value);
    },
    onCommentChange: function(comment) {
        function getLocalDateSpan(date) {
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

            // <span>
            //     ${month} ${day}, ${year} at 
            //     <span class="hour12-time">${hour12}:${minute} ${amPm}</span>
            //     <span class="hour24-time">${hour}:${minute}</span>
            // </span>
            let holder = document.createElement("span");

            let hour12Span = document.createElement("span");
            hour12Span.classList.add("hour12-time");
            let hour12Text = document.createTextNode(`${hour12}:${minute} ${amPm}`);
            hour12Span.appendChild(hour12Text);

            let hour24Span = document.createElement("span");
            hour24Span.classList.add("hour24-time");
            let hour24Text = document.createTextNode(`${hour}:${minute}`);
            hour24Span.appendChild(hour24Text);

            let dateText = document.createTextNode(`${month} ${day}, ${year} at `);
            holder.appendChild(dateText);
            holder.appendChild(hour12Span);
            holder.appendChild(hour24Span);

            return holder
        }

        function getEditedDateSpan(date) {
            let dateSpan = getLocalDateSpan(date);

            // <em>edited ${dateSpan}</em>
            let em = document.createElement("em");
            let editedText = document.createTextNode("edited ");
            em.appendChild(editedText);
            em.appendChild(dateSpan);
            return em;
        }

        function applyBetterDate() {
            let commentId = getCommentIdNumber(comment);

            if (!(commentId in commentIdToInfo && commentIdToInfo[commentId].date)) {
                return;
            }

            let metaDiv = $(comment).find("> .comment-content")
                .children().eq(1)
                .children().eq(0)
                .children().eq(0)
                .children().eq(0)
                .children().eq(0);

            let dateHolder = metaDiv.children("a").eq(0);

            // don't add if the new date element already exists
            if (dateHolder.find(".better-date:not(.incomplete)").length !== 0) {
                return;
            }

            let origDate = dateHolder.children()[0];
            origDate.classList.add("worse-date");

            let newDateIncomplete = dateHolder.find(".better-date.incomplete");
            let newDateDisplay = newDateIncomplete.length > 0 ? newDateIncomplete[0] : origDate.cloneNode();
            newDateDisplay.classList.remove("worse-date");
            newDateDisplay.classList.add("better-date", "incomplete");
            origDate.after(newDateDisplay);

            let utcTime = commentIdToInfo[commentId].date;
            let date = new Date(utcTime);
            newDateDisplay.textContent = "";
            newDateDisplay.appendChild(getLocalDateSpan(date));
            newDateDisplay.classList.remove("incomplete");
        }

        function applyBetterEditDate() {
            let commentId = getCommentIdNumber(comment);

            if (!(commentId in commentIdToInfo && commentIdToInfo[commentId].editedDate)) {
                return;
            }

            const metaDiv = $(comment).find("> .comment-content")
                .children().eq(1)
                .children().eq(0)
                .children().eq(0)
                .children().eq(0)
                .children().eq(0);

            const editedDateSpan = metaDiv.children("span")[0];

            // don't add if the new date element already exists
            if (metaDiv.find(".better-edited-indicator:not(.incomplete)").length !== 0) {
                return;
            }

            let newEditDateIncomplete = metaDiv.find(".better-edited-indicator.incomplete");
            let newEditDateDisplay = newEditDateIncomplete.length > 0 ? newEditDateIncomplete[0] : editedDateSpan.cloneNode();
            editedDateSpan.classList.add("edited-indicator");
            newEditDateDisplay.classList.add("better-edited-indicator", "incomplete");
            editedDateSpan.after(newEditDateDisplay);

            let utcTime = commentIdToInfo[commentId].editedDate;
            let editedDate = new Date(utcTime);
            newEditDateDisplay.textContent = "";
            newEditDateDisplay.appendChild(getEditedDateSpan(editedDate));
            newEditDateDisplay.classList.remove("incomplete");
        }

        applyBetterDate();
        applyBetterEditDate();
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
        this.ensureSeenComments();
        this.startSaveTimer();

        if ((!commentSeen || commentDate > this.newCommentDate) && optionShadow[this.key]) {
            if (!$(comment).hasClass("new-comment")) {
                $(comment).addClass("new-comment");
                let dateSpan = $(comment).find("> .comment-content .comment-meta > *:not(.highlight)").last();
                let newTagText = document.createElement("span");
                newTagText.classList.add("new-tag-text");
                newTagText.textContent = "~new~";
                let newTagCss = document.createElement("span");
                newTagCss.classList.add("new-tag-css");
                let newTag = document.createElement("span");
                newTag.classList.add("new-tag");
                newTag.appendChild(newTagText);
                newTag.appendChild(newTagCss);

                dateSpan.after(newTag);
            }
        } else {
            $(comment).removeClass("new-comment");
            let metaDiv = $(comment).find("> .comment-content .comment-meta");
            metaDiv.find(".new-tag").remove();
        }
    },
    onValueChange: function(value) {
        if (value) {
            $(document.documentElement).addClass("highlight-new");
        } else {
            $(document.documentElement).removeClass("highlight-new");
            this.alwaysProcessComments = true;
        }

        processAllComments();
        this.alwaysProcessComments = false;
    },
}

let newTimeOption = {
    key: "newTime",
    default: 0,
    hovertext: "Mark comments posted within the given time range as new",
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
        // quick first pass to rule out cases where formatting isn't needed
        if (!innerHtml.match(/[*_>]|&gt;/)) {
            let container = document.createElement("span");
            container.classList.add("new-style");
            container.innerHTML = innerHtml;
            return container;
        }

        // recursively use regexes to split the string into parts
        // ["starting *string* with _italics_ *here*"] =>
        // ["starting ", "<em>string</em>", " with _italics_ ", "<em>here</em>"] =>
        // ["starting ", "<em>string</em>", " with ", "<em>italics</em>", " ", "<em>here</em>"]
        function stringToList(regex, matchToTag, string) {
            let list = [];
            let match;
            while(match = string.match(regex)) {
                let matchLength = match[0].length;
                let prefix = match[1];

                if (prefix) list.push(prefix);
                list.push(matchToTag(match));

                string = string.substring(matchLength);
            }

            if (string) list.push(string);

            return list;
        }

        function listPass(regex, matchToTag, list) {
            return list.map(e => typeof e === "string" ? stringToList(regex, matchToTag, e) : e).flat();
        }

        let italicStarRegex = /(.*?(?:^|\s|\(|\[|\{|\*))\*((?=[^*\s]).*?(?<=[^*\s]))\*TODOREMOVE/;
        let italicUnderscoreRegex = /(.*?(?:^|\s|\(|\[|\{|_))_((?=[^_\s]).*?(?<=[^_\s]))_/;
        function italicToTag(match) {
            let e = document.createElement("em");
            e.innerHTML = match[2];
            return e;
        };
        // yes I'm parsing html with a regex. deal with it
        let linkRegex = /(.*?)\[(.+?)\]\(<a href="(.*?)".*?<\/a>\)/;
        function linkToTag(match) {
            let e = document.createElement("a");
            e.setAttribute("href", match[3]);
            e.classList.add("linkified");
            e.setAttribute("target", "_blank");
            e.setAttribute("rel", "nofollow ugc noreferrer");
            e.innerHTML = match[2];
            return e;
        }
        let bareLinkRegex = /(.*?)<a href="(.*?)".*?>(.*?)<\/a>/;
        function bareLinkToTag(match) {
            let e = document.createElement("a");
            e.setAttribute("href", match[2]);
            e.classList.add("linkified");
            e.setAttribute("target", "_blank");
            e.setAttribute("rel", "nofollow ugc noreferrer");
            e.innerHTML = match[3];
            return e;
        }

        let list = [innerHtml];
        list = listPass(linkRegex, linkToTag, list);
        list = listPass(bareLinkRegex, bareLinkToTag, list);
        list = listPass(italicStarRegex, italicToTag, list);
        list = listPass(italicUnderscoreRegex, italicToTag, list);

        // special case blockquotes
        let quoteIndent = 0;
        if (typeof list[0] === "string") {
            let match;
            while (match = list[0].match(/^\s*(>|&gt;)\s*TODOREMOVE/)) {
                quoteIndent++;
                list[0] = list[0].substring(match[0].length);
            }
        }

        let container = document.createElement("span");
        container.classList.add("new-style");

        let quoteContainer = container;
        for (let i = 0; i < quoteIndent; i++) {
            let b = document.createElement("blockquote");
            quoteContainer.appendChild(b);
            quoteContainer = b;
        }

        // build final span
        for (let entry of list) {
            if (typeof entry === "string") {
                quoteContainer.innerHTML += entry;
            } else {
                quoteContainer.appendChild(entry);
            }
        }

        return container;
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
                this.classList.add("old-style");
                let newSpan = that.processCommentParagraph(this.innerHTML);
                this.parentElement.appendChild(newSpan);
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
        $(`#${this.key}-css`).prop("disabled", value);
    },
    onCommentChange: function(comment) {
        let actions = $(comment).find("> .comment-content .comment-actions");

        // don't add link if it already exists
        if (actions.find(".parent-link").length !== 0) {
            return;
        }

        let parentComment = $(comment).parent().closest(".comment");
        let scrollElement, displayText;
        if (parentComment.length === 0) {
            // already at top level comment
            scrollElement = $(".comments-page");
            displayText = "Top";
        } else {
            scrollElement = parentComment.find("> .comment-anchor:first-child");
            displayText = "Parent";
        }

        // create parent link element
        // <span class="parent-link">
        //     <a>${displayText}</a>
        // </span>
        let parentLink = document.createElement("span");
        parentLink.classList.add("parent-link");
        let link = document.createElement("a");
        let text = document.createTextNode(displayText);
        link.appendChild(text);
        parentLink.appendChild(link);

        actions[0].appendChild(parentLink);

        parentLink.addEventListener("click", () => {
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
*/
const hideUsersOption = {
    key: "hideUsers",
    default: "",
    hovertext: "Hide comments from the listed users, in a comma separated list (if you don't like seeing the names in this box, add spaces at the front until they disappear)",
    alwaysProcessComments: true,
    onStart: function(value) {
        this.hiddenSet = new Set(optionManager.get(this.key).split(",").map(x => x.trim()).filter(x => x));
    },
    processComment: function(comment) {
        const commentId = comment.dataset.id;
        const name = CommentManager.get(commentId).username;
        if (this.hiddenSet.has(name)) {
            comment.classList.add("hidden");

            // no visible siblings, so hide the enclosing child list
            if (!comment.parentElement.querySelector(":scope > :not(.hidden)")) {
                comment.parentElement.classList.add("hidden");
            }
        } else {
            comment.classList.remove("hidden");
            comment.parentElement.classList.remove("hidden");
        }
    },
    onValueChange: function(value) {
        this.hiddenSet = new Set(optionManager.get(this.key).split(",").map(x => x.trim()).filter(x => x));
        optionManager.processAllComments();
    },
}

const allowKeyboardShortcutsOption = {
    key: "allowKeyboardShortcuts",
    default: true,
    hovertext: "Enable keyboard shortcuts for the various actions below",
}

const smoothScrollOption = {
    key: "smoothScroll",
    default: true,
    hovertext: "Smoothly scroll when moving between comments (uncheck this to disable the animation and jump directly to the comment)",
}

const prevCommentKeyOption = {
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

const nextCommentKeyOption = {
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

const prevUnreadKeyOption = {
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

const nextUnreadKeyOption = {
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

const parentKeyOption = {
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
/*
const customCssOption = {
    key: "customCss",
    default: "",
    hovertext: "Apply custom css to the page (don't enter anything you don't trust)",
    onStart: function(value) {
        const style = document.createElement("style");
        style.id = cssId(this.key);
        style.textContent = value;
        document.documentElement.appendChild(style);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).textContent = value;
    },
}
*/
const showDebugOption = {
    key: "showDebug",
    default: "",
    hovertext: "Show matching debugging output in the console (use <code>\"*\"</code> for all)",
}

const resetDataOption = {
    key: "resetData",
    default: false,
    hovertext: "Reset all extension data. Use if something breaks that refreshing doesn't fix. Will delete data about which comments have been seen.",
    onStart: function(value) {
        this.onValueChange(optionManager.get(this.key));
    },
    onValueChange: function(value) {
        if (value) {
            window.localStorage.removeItem(LOCAL_DATA_KEY);
            optionManager.set(this.key, false);
        }
    },
}



let optionArray = [
    fixHeaderOption,
    // useOldStylingOption,
    // darkModeOption,
    zenModeOption,
    // removeCommentsOption,
    // showHeartsOption,
    // showFullDateOption,
    // use24HourOption,
    // highlightNewOption,
    // newTimeOption,
    // applyCommentStylingOption,
    // addParentLinksOption,
    hideUsersOption,
    allowKeyboardShortcutsOption,
    smoothScrollOption,
    prevCommentKeyOption,
    nextCommentKeyOption,
    prevUnreadKeyOption,
    nextUnreadKeyOption,
    parentKeyOption,
    // customCssOption,
    showDebugOption,
    resetDataOption,
];

const OPTIONS = {};
const OptionKey = {};

for (const option of optionArray) {
    OPTIONS[option.key] = option;
    OptionKey[option.key] = option.key;
}
