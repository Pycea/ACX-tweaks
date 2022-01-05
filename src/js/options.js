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
//                                                              +--------+
//                                                              v        | on dynamic
//  first load   +-----------+  onStart() finishes   +----------------+  | page load
// ------------> | onStart() | --------------------> | onPageChange() | -+
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
//                 |                                          |                         | should be
// function        | run condition                            | args                    | idempotent
// ----------------+------------------------------------------+-------------------------+-----------
// onStart         | once, when the extension is first loaded | none                    | n/a
// onPageChange    | on each page/post change                 | none                    | n/a
// onLoad          | on each page once the DOM is loaded      | none                    | n/a
//                 |                                          |                         |
// onCommentChange | when a new comment is added              | the new comment         | yes
// onMutation      | when a mutation happens on the page      | the mutation            | no
// onValueChange   | when the value of the option changes     | new value, if first run | yes
//
// Run order on page load:
//     onStart() handlers
//     onPageChange() handlers
//     processAllComments()
//         onCommentChange() handlers for any existing comments
//     onLoad() handlers

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
            let that = this;
            $("#main").find(".post-preview").each(function() {
                that.processPost(this);
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
    hovertext: "Add hearts back to comments. Only people using an extension that adds back hearts will be able to heart comments or see them, so they won't have the activity they did before.",
    heartHtml: function(hearts, userReact, ownComment) {
        return `
            <span class="comment-heart">
                <a href="javascript:void(0)" class="like-button ${userReact ? "liked" : ""} ${ownComment ? "own-comment" : ""}">
                    <div class="reaction-container">
                        <svg class="empty" role="img" width="14" height="14" viewBox="0 0 19 19" fill="#757575"
                        stroke-width="1.3571428571428572" stroke="#757575" xmlns="http://www.w3.org/2000/svg"
                        style="height: 14px; width: 14px;">
                            <g>
                                <title></title>
                                <path fill-rule="evenodd" clip-rule="evenodd" stroke-width="0" d="M9.49988
                                3.04743C9.26828 2.69204 8.98813 2.32264 8.65639 1.9794C7.76925 1.06153 6.4436 0.270046
                                4.69051 0.561336C3.00415 0.84154 1.93399 1.82567 1.30794 2.92853C0.697174 4.00446 0.5
                                5.19971 0.5 6.02946C0.5 8.53367 1.15798 10.4555 3.00125 12.9132C3.94096 14.1662 5.4683
                                15.5335 6.71518 16.5603C7.34697 17.0806 7.92243 17.5261 8.34008 17.8417C8.54907 17.9996
                                8.71896 18.1253 8.83714 18.2118C8.89624 18.2551 8.94243 18.2887 8.97415 18.3116L9.01069
                                18.338L9.02045 18.345L9.02314 18.3469L9.02393 18.3475C9.02402 18.3475 9.02434 18.3478
                                9.49989 17.682L9.02393 18.3475C9.30841 18.5507 9.69097 18.5509 9.97545 18.3477L9.49989
                                17.682C9.97545 18.3477 9.97536 18.3478 9.97545 18.3477L9.97665 18.3469L9.98911
                                18.338L10.0256 18.3116C10.0574 18.2887 10.1036 18.2551 10.1626 18.2118C10.2808 18.1253
                                10.4507 17.9996 10.6597 17.8417C11.0773 17.5261 11.6528 17.0806 12.2845 16.5603C13.5314
                                15.5335 15.0587 14.1662 15.9984 12.9132C17.8416 10.4555 18.4997 8.53369 18.4997
                                6.02946C18.4997 5.19971 18.3025 4.00446 17.6918 2.92853C17.0657 1.82567 15.9956 0.84154
                                14.3092 0.561336C12.5561 0.270046 11.2305 1.06153 10.3434 1.97941C10.0116 2.32264
                                9.73148 2.69204 9.49988 3.04743ZM9.49988 16.6664C9.4459 16.6261 9.38799 16.5825 9.32651
                                16.5361C8.92233 16.2307 8.36549 15.7996 7.7554 15.2972C6.51853 14.2786 5.12382 13.0161
                                4.31032 11.9314C2.64716 9.71387 2.13634 8.12929 2.13634 6.02946C2.13634 5.41573 2.28981
                                4.51351 2.73098 3.73633C3.15687 2.98608 3.83993 2.36144 4.95873 2.17554C6.01081 2.00073
                                6.82799 2.44222 7.47979 3.1166C8.14566 3.80554 8.565 4.67251 8.74056 5.11008C8.86502
                                5.42029 9.16565 5.62359 9.49989 5.62359C9.83413 5.62359 10.1348 5.42029 10.2592
                                5.11008C10.4348 4.6725 10.8541 3.80553 11.52 3.11659C12.1717 2.44222 12.9889 2.00073
                                14.041 2.17554C15.1598 2.36144 15.8428 2.98608 16.2687 3.73633C16.7099 4.51351 16.8634
                                5.41573 16.8634 6.02946C16.8634 8.12927 16.3525 9.71386 14.6893 11.9314C13.8758 13.0161
                                12.4811 14.2786 11.2443 15.2972C10.6342 15.7996 10.0774 16.2307 9.67324 16.5361C9.61177
                                16.5825 9.55386 16.6261 9.49988 16.6664Z"></path>
                            </g>
                        </svg>
                        <svg class="full" role="img" width="14" height="14" viewBox="0 0 19 19" fill="#757575"
                        stroke-width="1.3571428571428572" stroke="#757575" xmlns="http://www.w3.org/2000/svg"
                        style="height: 14px; width: 14px;">
                            <g>
                                <title></title>
                                <path d="M8.18906 16.4003C8.18906 16.4003 8.19004 16.401 8.50003 15.967M8.18906
                                16.4003L8.50003 15.967M8.18906 16.4003C8.3745 16.5328 8.62459 16.5335 8.81003
                                16.401M8.18906 16.4003L8.18673 16.3986L8.17807 16.3924L8.14524 16.3688C8.11664 16.3481
                                8.07484 16.3177 8.02129 16.2785C7.91419 16.2 7.75999 16.086 7.57019 15.9425C7.19079
                                15.6559 6.66805 15.2512 6.0943 14.7787C4.9577 13.8427 3.58112 12.6085 2.73999
                                11.487C1.08129 9.27538 0.5 7.56545 0.5 5.33279C0.5 4.60372 0.674245 3.55113 1.20952
                                2.60817C1.75476 1.64766 2.68094 0.796397 4.14593 0.552976C5.65441 0.302327 6.79792
                                0.979011 7.57685 1.78493C7.95999 2.18134 8.26591 2.61863 8.50003 3.01638C8.73414 2.61863
                                9.04005 2.18134 9.42318 1.78493C10.2021 0.979012 11.3456 0.302327 12.8541
                                0.552976C14.3191 0.796397 15.2452 1.64766 15.7905 2.60817C16.3258 3.55113 16.5 4.60372
                                16.5 5.33279C16.5 7.56546 15.9186 9.27539 14.2599 11.487C13.4188 12.6085 12.0423 13.8427
                                10.9057 14.7787C10.332 15.2512 9.80925 15.6559 9.42987 15.9425C9.24007 16.0859 9.08588
                                16.2 8.97878 16.2785C8.92523 16.3177 8.88344 16.3481 8.85484 16.3687L8.82201
                                16.3924L8.81334 16.3986L8.81003 16.401M8.50003 15.967L8.81003 16.401M8.50003
                                15.967C8.81003 16.401 8.81003 16.401 8.81003 16.401M8.50003 15.3062C8.41803 15.2454
                                8.32165 15.1734 8.2132 15.0915C7.84258 14.8115 7.33198 14.4161 6.77238 13.9553C5.6423
                                13.0247 4.35218 11.8588 3.59332 10.847C2.05203 8.79192 1.56666 7.30184 1.56666
                                5.33279C1.56666 4.74453 1.71242 3.88296 2.13715 3.13475C2.55191 2.40409 3.22574 1.78717
                                4.32077 1.60522C5.37229 1.4305 6.18435 1.87904 6.80987 2.52623C7.44456 3.18291 7.83982
                                4.00249 8.00506 4.41433C8.08619 4.61654 8.28216 4.74906 8.50003 4.74906C8.71791 4.74906
                                8.91388 4.61654 8.99501 4.41433C9.16025 4.00248 9.55549 3.1829 10.1902 2.52623C10.8157
                                1.87904 11.6277 1.4305 12.6792 1.60522C13.7743 1.78717 14.4481 2.40409 14.8629
                                3.13475C15.2876 3.88296 15.4333 4.74453 15.4333 5.33279C15.4333 7.30183 14.9479 8.79191
                                13.4066 10.847C12.6478 11.8588 11.3577 13.0247 10.2276 13.9553C9.66803 14.4162 9.15745
                                14.8115 8.78684 15.0915C8.67839 15.1734 8.58202 15.2454 8.50003 15.3062Z"
                                stroke-width="0.5" stroke-linejoin="round"></path>
                            </g>
                        </svg>
                        <span class="like-count">
                            ${hearts > 0 ? hearts : ""}
                        </span>
                    </div>
                </a>
            </span>
        `;
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
        $(document.body).on("click", ".like-button", function() {
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
                method = "POST";
                hearts++;
            } else {
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

            let url = `https://astralcodexten.substack.com/api/v1/comment/${commentId}/reaction`;
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
            if (actions.html() != "") {
                for (let childAction of actions.children()) {
                    let text = $(childAction).text();
                    if (text === "Reply") {
                        $(childAction).addClass("action-reply");
                    } else if (text === "Delete") {
                        $(childAction).addClass("action-delete");
                    } else {
                        $(childAction).addClass("action-more");
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

        function applyBetterDate() {
            let commentId = getCommentIdNumber(comment);
            let dateSpan = $(comment).find("> .comment-content .comment-meta > span:nth-child(2)");

            // don't add if the new date element already exists
            if (dateSpan.find(".better-date:not(.incomplete)").length !== 0) {
                return;
            }

            let origDate = dateSpan.children("a:not(.commenter-publication):first");
            origDate.addClass("worse-date");

            let newDateIncomplete = dateSpan.find(".better-date.incomplete");
            let newDateDisplay = newDateIncomplete.length > 0 ? newDateIncomplete : origDate.clone();
            newDateDisplay.removeClass("worse-date").addClass("better-date incomplete");
            origDate.after(newDateDisplay);

            if (commentId in commentIdToInfo) {
                let utcTime = commentIdToInfo[commentId].date;
                let date = new Date(utcTime);
                newDateDisplay.html(getLocalDateString(date));
                newDateDisplay.removeClass("incomplete");
            }
        }

        function applyBetterEditDate() {
            let commentId = getCommentIdNumber(comment);
            let commentMeta = $(comment).find("> .comment-content .comment-meta");

            // don't add if the new date element already exists
            if (commentMeta.find(".better-edited-indicator:not(.incomplete)").length !== 0) {
                return;
            }

            if (commentId === 4212361) {
                console.log(commentMeta)
            }

            let origEditDate = commentMeta.find(".edited-indicator");

            if (commentId === 4212361) {
                console.log(origEditDate)
            }

            let newEditDateIncomplete = commentMeta.find(".better-edited-indicator.incomplete");
            let newEditDateDisplay = newEditDateIncomplete.length > 0 ? newEditDateIncomplete : origEditDate.clone();
            newEditDateDisplay.removeClass("edited-indicator").addClass("better-edited-indicator incomplete");
            origEditDate.after(newEditDateDisplay);

            if (commentId === 4212361) {
                console.log(newEditDateDisplay)
            }

            if (commentId in commentIdToInfo) {
                let utcTime = commentIdToInfo[commentId].editedDate;
                let editedDate = new Date(utcTime);
                let editedDateHtml = `<em>edited ${getLocalDateString(editedDate)}</em>`
                newEditDateDisplay.html(editedDateHtml);
                newEditDateDisplay.removeClass("incomplete");
            }
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
            this.alwaysProcessComments = true;
        }

        processAllComments();
        this.alwaysProcessComments = false;
    },
}

let newTimeOption = {
    key: "newTime",
    default: 0,
    hovertext: "Mark comments posted within this time range as new",
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
        let blockQuoteRegex = /^\s*(>|&gt;)\s*(.*)$/;
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
        $(`#${this.key}-css`).prop("disabled", value);

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
        let that = this;
        for (let timeout of [0, 500, 1000, 2000]) {
            setTimeout(function() {
                that.onValueChange(optionShadow.loadAll);
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
            let that = this;
            $("#main").find("button.collapsed-reply").each(function() {
                that.processButton(this);
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
        let nameTag = $(comment).find("> .comment-content .comment-meta .commenter-name .account-hover-wrapper > a");
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
    hovertext: "Apply custom css to the page (don't enter anything you don't trust)",
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
    hovertext: "Run custom JS when the page is first loaded (don't enter anything you don't trust)",
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
    hovertext: "Run custom JS when a new page/post is visited (don't enter anything you don't trust)",
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
    hovertext: "Run custom JS when the DOM is loaded (don't enter anything you don't trust)",
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
    hovertext: "Dynamically load content when switching between posts (default Substack behavior). Enabling can decrease load times, but some things may break, and the comments may appear out of order due to an issue with Substack.",
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
            localStorageData = {};
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
