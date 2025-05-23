"use strict";

const OPTION_KEY = "options";

const SortOrder = Object.freeze({
    "OldFirst": "OldFirst",
    "NewFirst": "NewFirst",
    "PostDefault": "PostDefault",
});

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
//     onPreload: function() { ... },
//     processComment: function(comment) { ... },
//     onValueChange: function(value) { ... },
// }
//
// Run order on page load:
//     onStart() handlers
//     load _preloads from page and PageInfo.init()
//     onPreload() handlers
//     processAllComments()
//         processComment() handlers for any existing comments
//     onLoad() handlers

const darkModeOption = {
    key: "darkMode",
    default: window.matchMedia("(prefers-color-scheme: dark)").matches,
    hovertext: "Make this popup dark mode (does not apply to blog itself). To make the page dark, use an extension like Dark Reader.",
};

const useOldStylingOption = {
    key: "useOldStyling",
    default: false,
    hovertext: "Use styling similar to the old blog Slate Star Codex",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onLoad: function(value) {
        if (value) {
            const numComments = Object.keys(CommentManager.commentIdToInfo).length;
            const responseList = document.querySelector("#discussion > :first-child > h4");
            if (responseList) {
                responseList.innerHTML =
                    `${numComments} responses to <em>${htmlEscape(PageInfo.postTitle)}</em>`;
            }
        }
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
    },
};

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
};

const zenModeOption = {
    key: "zenMode",
    default: false,
    hovertext: "Remove all like, share, and other clutter (use separate option below to disable comments)",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
    },
};

const smoothScrollOption = {
    key: "smoothScroll",
    default: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    hovertext: "Smoothly scroll when moving between comments (uncheck this to disable the animation and jump directly to the comment)",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
    },
};


const highlightNewOption = {
    key: "highlightNew",
    default: true,
    hovertext: "Highlight comments that you haven't seen yet",
    updateNewTime: function(deltaMs) {
        this.newCommentCutoff = new Date(PageInfo.loadDate - deltaMs);
    },
    onStart: function(value) {
        document.documentElement.classList.toggle("highlight-new", value);
    },
    processComment: function(comment) {
        const commentId = comment.dataset.id;
        const commentInfo = CommentManager.get(commentId);
        const commentDate = commentInfo.editedDate || commentInfo.date;
        const commentSeen = PageInfo.lastViewedDate && commentDate <= PageInfo.lastViewedDate;
        const header = comment.querySelector(":scope > .comment-content .comment-header");

        if (!commentSeen || commentDate && commentDate >= this.newCommentCutoff) {
            if (header.querySelector(".new-tag-text")) {
                return;
            }
            comment.classList.add("new-comment");
            const newTag = document.createElement("div");
            newTag.classList.add("new-tag-text");
            newTag.textContent = "~new~";
            header.appendChild(newTag);
        } else {
            comment.classList.remove("new-comment");
            header.querySelector(".new-tag-text")?.remove();
        }
    },
    onValueChange: function(value) {
        if (value) {
            optionManager.processAllComments(this.key);
            document.documentElement.classList.add("highlight-new");
        } else {
            document.documentElement.classList.remove("highlight-new");
        }
    },
};

const newTimeOption = {
    key: "newTime",
    default: 0,
    hovertext: "Mark comments posted within the given time range as new",
    onLoad: function(value) {
        OPTIONS.highlightNew.updateNewTime(value);
    },
    onValueChange: function(value) {
        OPTIONS.highlightNew.updateNewTime(value);
        optionManager.processAllComments(OPTIONS.highlightNew.key);
    },
};

const applyCommentStylingOption = {
    key: "applyCommentStyling",
    default: true,
    hovertext: "Apply basic styling to comments (italics, block quotes, and Markdown style text links)",
    processCommentParagraph: function(innerHtml) {
        // skip paragraphs with no formatting
        if (!/[\[*_]|^&gt;/.test(innerHtml)) {
            return null;
        }

        const container = document.createElement("span");
        container.classList.add("new-style");

        const italicPattern = /(?<![a-z0-9])([_*])((?:[a-z0-9])[^*_]*?(?<=[a-z0-9]))\1(?![a-z0-9])/gi;
        const formattedLinkPattern = /\[([^\]]+)\]\(<a\s+href=["']([^"']+)["'][^>]*>.*?<\/a>\)/g;
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        const blockquotePattern = /^((&gt;\s*)+)/;

        innerHtml = innerHtml.replace(italicPattern, "<em>$2</em>");
        innerHtml = innerHtml.replace(formattedLinkPattern, (_, text, href) => {
            return `<a href='${href}' target='_blank' rel='noreferrer'>${text}</a>`;
        });
        innerHtml = innerHtml.replace(linkPattern, (_, text, href) => {
            if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)) {
                href = `https://${href}`;
            }
            return `<a href='${href}' target='_blank' rel='noreferrer'>${text}</a>`;
        });

        const match = innerHtml.match(blockquotePattern);
        if (match) {
            const depth = match[0].match(/&gt;\s*/g).length;
            const content = `${innerHtml.slice(match[0].length)}`;
            innerHtml = "<blockquote>".repeat(depth) + content + "</blockquote>".repeat(depth);
        }

        container.innerHTML = innerHtml;
        return container;
    },
    onStart: function(value) {
        addStyle(this.key);
        document.getElementById(cssId(this.key)).disabled = !value;
    },
    processComment: function(comment) {
        const commentId = comment.dataset.id;
        const body = CommentManager.get(commentId).body;
        // quick first pass to rule out cases where formatting isn't needed
        if (!/[\[*_>]/.test(body)) {
            return;
        }

        const commentBody = comment.querySelector(":scope > .comment-content .comment-body");
        commentBody.querySelectorAll("p span").forEach((span) => {
            // only process the text once
            if (span.parentElement.children.length === 1) {
                const newSpan = this.processCommentParagraph(span.innerHTML);
                if (newSpan) {
                    span.classList.add("old-style");
                    span.parentElement.appendChild(newSpan);
                }
            }
        }, this);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
        if (value) {
            optionManager.processAllComments(this.key);
        }
    },
};

const showFullDateOption = {
    key: "showFullDate",
    default: true,
    hovertext: "Show the full date and time when a comment was posted and edited",
    onStart: function(value) {
        addStyle(this.key);
        document.getElementById(cssId(this.key)).disabled = !value;
    },
    processComment: function(comment) {
        const commentContent = comment.querySelector(":scope > .comment-content");
        const commentId = comment.dataset.id;
        const commentInfo = CommentManager.get(commentId);

        function getLocalDateElem(date) {
            const months = [
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

            const year = date.getFullYear();
            const month = months[date.getMonth()];
            const day = date.getDate();
            const hour = date.getHours();
            const minute = date.getMinutes().toString().padStart(2, "0");

            const amPm = hour <= 11 ? "am" : "pm";
            const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);

            // <div>
            //     ${month} ${day}, ${year} at
            //     <span class="hour12-time">${hour12}:${minute} ${amPm}</span>
            //     <span class="hour24-time">${hour}:${minute}</span>
            // </div>
            const holder = document.createElement("div");
            holder.textContent = `${month} ${day}, ${year} at `;

            const hour12Span = document.createElement("span");
            hour12Span.classList.add("hour12-time");
            hour12Span.textContent = `${hour12}:${minute} ${amPm}`;

            const hour24Span = document.createElement("span");
            hour24Span.classList.add("hour24-time");
            hour24Span.textContent = `${hour}:${minute}`;

            holder.appendChild(hour12Span);
            holder.appendChild(hour24Span);

            return holder
        }

        function getEditedDateElem(date) {
            const dateElem = getLocalDateElem(date);
            dateElem.firstChild.textContent = "edited " + dateElem.firstChild.textContent;
            return dateElem;
        }

        function applyBetterDate() {
            if (!commentInfo.date || commentContent.querySelector(".better-date")) {
                return;
            }

            const date = commentInfo.date;

            const origDate = commentContent.querySelector(".comment-post-date");
            origDate.classList.add("worse-date");

            const betterDate = getLocalDateElem(date);
            betterDate.classList.add("comment-post-date", "better-date");

            origDate.after(betterDate);
        }

        function applyBetterEditDate() {
            if (!commentInfo.editedDate || commentContent.querySelector(".better-edited-date")) {
                return;
            }

            const date = commentInfo.editedDate;

            const origDate = commentContent.querySelector(".comment-edited");
            origDate.classList.add("worse-edited-date");

            const betterDate = getEditedDateElem(date);
            betterDate.classList.add("comment-edited", "better-edited-date");

            origDate.after(betterDate);
        }

        applyBetterDate();
        applyBetterEditDate();
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
        if (value) {
            optionManager.processAllComments(this.key);
        }
    },
};

const use24HourOption = {
    key: "use24Hour",
    default: false,
    hovertext: "Use 24 hour time for the full date",
    onStart: function(value) {
        addStyle(this.key);
        this.onValueChange(value);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = !value;
    },
};

const showHeartsOption = {
    key: "showHearts",
    default: false,
    hovertext: "Add hearts back to comments. Only people using an extension that adds back hearts will be able to like comments or see them, so they won't have the activity they did before.",
    heartHtml: function(hearts, userReact, ownComment) {
        const heartContainer = document.querySelector("#heart-template").content.cloneNode(true);
        const likeButton = heartContainer.querySelector(".like-button");
        const likeCount = heartContainer.querySelector(".like-count");
        if (userReact) {
            likeButton.classList.add("liked");
        }
        if (ownComment) {
            likeButton.classList.add("own-comment");
        }
        likeCount.textContent = hearts ? hearts : "";
        return heartContainer;
    },
    onStart: function(value) {
        addStyle(this.key);
        document.getElementById(cssId(this.key)).disabled = value;
    },
    processComment: function(comment) {
        const commentId = comment.dataset.id;
        const commentInfo = CommentManager.get(commentId);
        const deleted = commentInfo.deleted;
        const footer = comment.querySelector(":scope > .comment-content .comment-footer");

        if (footer.querySelector(".comment-heart")) {
            if (deleted) {
                footer.querySelector(".comment-heart").remove();
            }
            return;
        }

        const hearts = commentInfo.hearts;
        const userReact = commentInfo.userReact;
        const ownComment = commentInfo.userId === PageInfo.userId;
        const heartContainer = this.heartHtml(hearts, userReact, ownComment);
        const commentHeart = heartContainer.querySelector(".comment-heart");
        const likeButton = commentHeart.querySelector(".like-button");

        // disable your own comment like button
        if (PageInfo.userId === commentInfo.userId) {
            commentHeart.disabled = true;
        }

        commentHeart.addEventListener("click", async () => {
            debug("funcs_showHearts.onClick", "showHearts.onClick()");
            const commentInfo = CommentManager.get(commentId);
            const url = `https://www.astralcodexten.com/api/v1/comment/${commentId}/reaction`;
            const method = commentInfo.userReact ? "DELETE" : "POST";
            const data = {reaction: "❤"};

            let response;
            let error;
            try {
                response = await apiCall(url, method, data);
                error = response.error;
            } catch {
                error = "Error liking post";
            }

            if (error) {
                debug("commentActionLike", "like failed", error);
                alert(error);
                return;
            }

            CommentManager.toggleReaction(commentId);
            likeButton.classList.toggle("liked");
            likeButton.querySelector(".like-count").textContent =
                commentInfo.hearts ? commentInfo.hearts : "";

        });

        footer.prepend(heartContainer);
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = value;
        if (value) {
            optionManager.processAllComments(this.key);
        }
    },
};

const addParentLinksOption = {
    key: "addParentLinks",
    default: true,
    hovertext: "Add links to scroll to the parent comment, or the top of the comments page for top level comments",
    onStart: function(value) {
        addStyle(this.key);
        document.getElementById(cssId(this.key)).disabled = value;
    },
    processComment: function(comment) {
        const footer = comment.querySelector(":scope > .comment-content .comment-footer");

        // don't add link if it already exists
        if (footer.querySelector(".parent-link")) {
            return;
        }

        const parentComment = comment.parentElement.parentElement;
        let scrollElement, displayText;
        if (!parentComment.classList.contains("comment")) {
            // already at top level comment
            scrollElement = document.querySelector("#discussion");
            displayText = "Top";
        } else {
            scrollElement = parentComment;
            displayText = "Parent";
        }

        // create parent link element
        // <div class="parent-link">
        //     ${displayText}
        // </div>
        const parentLink = document.createElement("button");
        parentLink.classList.add("parent-link");
        parentLink.textContent = displayText;
        footer.appendChild(parentLink);

        parentLink.addEventListener("click", () => {
            scrollElement.scrollIntoView();
            scrollElement.focus({preventScroll: true});
        });
    },
    onValueChange: function(value) {
        document.getElementById(cssId(this.key)).disabled = value;
        if (value) {
            optionManager.processAllComments(this.key);
        }
    },
};


const defaultSortOption = {
    key: "defaultSort",
    default: SortOrder.OldFirst,
    hovertext: "Default ordering for comments. Post default is the ordering specified by Substack, which is old first for most posts, and new first for open threads.",
    onPreload: function(value) {
        PageInfo.commentSort = value === SortOrder.PostDefault ? PageInfo.defaultSort : value;
    },
};

const autoCollapseDepthOption = {
    key: "autoCollapseDepth",
    default: "",
    hovertext: "Automatically collapse comments beyond the given depth. Set to 0 to collapse top level comments, or a negative number to keep all expanded.",
    processComment: function(comment) {
        const depth = parseInt(comment.dataset.depth);
        const collapseDepth = parseInt(optionManager.get(this.key));
        const collapseMod = optionManager.get(OptionKey.collapseMod);
        const collapse =
            collapseDepth < 0 ? false :
                collapseDepth === 0 ? collapseMod || depth === 0 :
                    (collapseMod && depth > 0 && depth % collapseDepth === 0 ||
                        collapseDepth === depth);
        comment.classList.toggle("collapsed", collapse);
    }
};

const collapseModOption = {
    key: "collapseMod",
    default: true,
    hovertext: "If true and auto collapse isn't negative, collapses children of every nth level nested comment. If auto collapse is 5, then collapses children of levels 5, 10, etc. If false, only children of level 5 are collapsed.",
};

const hideUsersOption = {
    key: "hideUsers",
    default: "",
    hovertext: "Hide comments from the listed users, in a comma separated list (if you don't like seeing the names in this box, add spaces at the front until they disappear)",
    alwaysProcessComments: true,
    onStart: function(value) {
        this.hiddenSet = new Set(
            optionManager.get(this.key)
                .split(",")
                .map(x => x.trim())
                .filter(x => x));
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
        this.hiddenSet = new Set(
            optionManager.get(this.key)
            .split(",")
            .map(x => x.trim())
            .filter(x => x));
        optionManager.processAllComments(this.key);
    },
};

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
};


const allowKeyboardShortcutsOption = {
    key: "allowKeyboardShortcuts",
    default: true,
    hovertext: "Enable keyboard shortcuts for the various actions below",
};

const jumpCommentsKeyOption = {
    key: "jumpCommentsKey",
    default: {
        "key": 67,
        "control": false,
        "alt": false,
        "shift": false,
        "meta": false,
    },
    hovertext: "Key/key combo to jump to the start of the comment section (click the box to set)",
};

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
};

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
};

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
};

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
};

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
};


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
};

const showDebugOption = {
    key: "showDebug",
    default: "",
    hovertext: "Show matching debugging output in the console (use <code>\"*\"</code> for all)",
};


const resetDataOption = {
    key: "resetData",
    default: false,
    hovertext: "Reset all extension data. Use if something breaks that refreshing doesn't fix. Will delete data about which comments have been seen.",
    onStart: function(value) {
        this.onValueChange(optionManager.get(this.key));
    },
    onValueChange: function(value) {
        if (value) {
            localStorageManager.resetData();
            optionManager.set(this.key, false);
        }
    },
};



const optionArray = [
    darkModeOption,
    useOldStylingOption,
    fixHeaderOption,
    zenModeOption,
    smoothScrollOption,

    highlightNewOption,
    newTimeOption,
    applyCommentStylingOption,
    showFullDateOption,
    use24HourOption,
    showHeartsOption,
    addParentLinksOption,

    defaultSortOption,
    autoCollapseDepthOption,
    collapseModOption,
    hideUsersOption,
    removeCommentsOption,

    allowKeyboardShortcutsOption,
    jumpCommentsKeyOption,
    parentKeyOption,
    prevCommentKeyOption,
    nextCommentKeyOption,
    prevUnreadKeyOption,
    nextUnreadKeyOption,

    customCssOption,
    showDebugOption,

    resetDataOption,
];

const OPTIONS = {};
const OptionKey = {};

for (const option of optionArray) {
    OPTIONS[option.key] = option;
    OptionKey[option.key] = option.key;
}
