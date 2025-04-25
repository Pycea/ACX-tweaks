"use strict";

// DEBUG handles
// option*
//     optionInitial: initial option values
//     optionGet: receive option change
//     optionSet: setting option value
// processCommentOption: each comment option run
// processComment: each comment processed
// keyPress*
//     keyPressEvent: each key press
//     keyPressBinary: binary search internals
// pageEvent: related to page events (onStart and onLoad)
// commentAction*
//     commentActionReply: replying to comments
//     commentActionEdit: editing comments
//     commentActionDelete: deleting comments
// func*
//     func_<func_name>: function calls that are called a lot and probably not too useful
//     funcs_<func_name>: other function calls

// OPTIONS loaded from options.js
// STYLES loaded from styles.js

const LOCAL_DATA_KEY = "acx-local-data-test";

const PageType = Object.freeze({
    "Main": "Main",
    "Post": "Post",
    "Comments": "Comments",
    "Unknown": "Unknown",
});

const KeyCommand = Object.freeze({
    "PrevComment": "PrevComment",
    "NextComment": "NextComment",
    "PrevUnread": "PrevUnread",
    "NextUnread": "NextUnread",
    "Parent": "Parent",
    "Unknown": "Unknown",
});


class OptionManager {
    constructor(localStorageKey, optionDict) {
        this.localStorageKey = localStorageKey;
        this.optionDict = optionDict;
        this.optionShadow = {};
    }

    async init() {
        logFuncCall();
        const result = await chrome.storage.local.get([this.localStorageKey]);
        if (result[this.localStorageKey]) {
            this.optionShadow = result[this.localStorageKey];
        }

        this.processInitialValues();
    }

    processInitialValues() {
        logFuncCall();

        for (const [key, option] of Object.entries(this.optionDict)) {
            let value = this.optionShadow[key];
            if (value === undefined) {
                // the option hasn't been set in local storage, set it to the default
                value = option.default;
                this.optionShadow[key] = value;
                debug("optionInitial", `${key} not found, setting to`, value);
            } else {
                debug("optionInitial", `${key} initial value is`, value);
            }
        }

        chrome.storage.local.set({[this.localStorageKey]: this.optionShadow});
    }

    runOnStartHandlers() {
        for (const [key, option] of Object.entries(this.optionDict)) {
            if (option.onStart) {
                debug("funcs_" + key + ".onStart", key + ".onStart()");
                option.onStart(this.optionShadow[key]);
            }
        }
    }

    set(key, value) {
        logFuncCall();
        debug("optionSet", `Changing option ${key}, `,
            this.optionShadow[key], "->", value);
        this.optionShadow[key] = value;
        chrome.storage.local.set({[this.localStorageKey]: this.optionShadow});
    }

    get(value) {
        return this.optionShadow[value];
    }

    doOptionChange(key, value) {
        logFuncCall();
        if (key in this.optionDict && this.optionDict[key].onValueChange) {
            debug("optionGet", `Processing option change for ${key}`);
            debug("funcs_" + key + ".onValueChange", key + ".onValueChange()");
            this.optionDict[key].onValueChange(value, false);
        }
    }

    processOptionChange(changes, namespace) {
        logFuncCall();
        const optionChanges = changes[this.localStorageKey];
        if (namespace !== "local" || !optionChanges) {
            return;
        }

        const changedKeys = [];

        for (const [key, newValue] of Object.entries(optionChanges.newValue)) {
            // hacky, but an easy way to implement isEqual for dicts
            const newValueString = JSON.stringify(newValue);
            const oldValueString = JSON.stringify(optionChanges?.oldValue?.[key]);

            if (newValueString !== oldValueString && this.optionDict[key]) {
                debug("optionGet", `Got change for ${key}`,
                    optionChanges.oldValue?.[key], "->", newValue);
                this.optionShadow[key] = newValue;
                changedKeys.push(key);
            }
        }

        for (const key of changedKeys) {
            this.doOptionChange(key, optionChanges.newValue[key]);
        }
    }

    processAllComments(...optionKeys) {
        logFuncCall();

        let commentHandlerObjects;
        if (optionKeys.length === 0) {
            commentHandlerObjects = Object.values(this.optionDict)
                .filter(o =>
                    o.processComment &&
                    (this.optionShadow[o.key] || o.alwaysProcessComments));
        } else {
            commentHandlerObjects = optionKeys.map(key => this.optionDict[key]);
        }

        if (commentHandlerObjects.length === 0) {
            return;
        }

        debug("processCommentOption", "Processing options",
            commentHandlerObjects.map(o => o.key).join(", "));

        const comments = document.querySelectorAll(".comment");
        for (const comment of comments) {
            debug("processComment", comment);
            for (const object of  commentHandlerObjects) {
                debug("func_" + object.key + ".processComment", object.key + ".processComment()");
                object.processComment(comment);
            }
        }
    }

    processComment(comment, ...optionKeys) {
        logFuncCall();

        let commentHandlerObjects;
        if (optionKeys.length === 0) {
            commentHandlerObjects = Object.values(this.optionDict)
                .filter(o =>
                    o.processComment &&
                    (this.optionShadow[o.key] || o.alwaysProcessComments));
        } else {
            commentHandlerObjects = optionKeys.map(key => this.optionDict[key]);
        }

        if (commentHandlerObjects.length === 0) {
            return;
        }

        debug("processCommentOption", "Processing single comment options",
            commentHandlerObjects.map(o => o.key).join(", "));
        debug("processComment", comment);
        for (const object of  commentHandlerObjects) {
            debug("func_" + object.key + ".processComment", object.key + ".processComment()");
            object.processComment(comment);
        }
    }
}

class LocalStorageManager {
    constructor(localStorageKey, postName) {
        this.localStorageKey = localStorageKey;
        this.postName = postName;

        const dataString = window.localStorage.getItem(this.localStorageKey);
        if (dataString) {
            this.localStorageData = JSON.parse(dataString);
        } else {
            this.localStorageData = {};
        }
    }

    save() {
        logFuncCall();
        window.localStorage.setItem(this.localStorageKey,
            JSON.stringify(this.localStorageData));
    }

    set(key, value) {
        logFuncCall();
        if (!this.localStorageData[this.postName]) {
            this.localStorageData[this.postName] = {};
        }
        this.localStorageData[this.postName][key] = value;
        this.save();
    }

    get(key) {
        logFuncCall();
        return this.localStorageData[this.postName]?.[key];
    }

    resetData() {
        logFuncCall();
        window.localStorage.removeItem(this.localStorageKey);
    }
}

class PageInfo {
    static preloads;
    static userId;
    static avatarUrl;
    static pageType;
    static postId;
    static postName;
    static loadDate;

    static init(preloads, localStorageManager) {
        logFuncCall();

        PageInfo.preloads = preloads;
        PageInfo.userId = preloads.user?.id;
        PageInfo.username = preloads.user?.name;
        PageInfo.avatarUrl = preloads.user?.photo_url;

        if (/\/p\/.*\/comment/.test(location.pathname)) {
            PageInfo.pageType = PageType.Comments;
        } else if (/\/p\//.test(location.pathname)) {
            PageInfo.pageType = PageType.Post;
        } else if (location.pathname === "/") {
            PageInfo.pageType = PageType.Main;
        } else {
            PageInfo.pageType = PageType.Unknown;
        }

        PageInfo.postId = preloads.post?.id;
        PageInfo.postName = preloads.post?.slug;

        PageInfo.loadDate = new Date();
        const dateString = localStorageManager.get("lastViewedDate");
        PageInfo.lastViewedDate = dateString ? new Date(dateString) : null;
    }
}

class CommentManager {
    static commentIdToInfo;
    static topLevelComments;

    static init(nestedComments) {
        logFuncCall();

        CommentManager.commentIdToInfo = {};
        CommentManager.topLevelComments = [];

        const getInfoRecursive = (comment) => {
            const commentId = comment.id;
            const userId = comment.user_id;
            const username = comment.name;
            const userPhoto = comment.photo_url;
            const ancestorPath = comment.ancestor_path;
            const date = comment.date;
            const editedDate = comment.edited_at;
            const deleted = comment.deleted;
            const hearts = comment.reactions?.["❤"] || 0;
            const userReact = comment.reaction;
            const body = comment.body;
            const children = [];

            for (const childComment of comment.children) {
                children.push(childComment.id);
                getInfoRecursive(childComment);
            }

            CommentManager.addComment({
                commentId,
                userId,
                username,
                userPhoto,
                ancestorPath,
                date,
                editedDate,
                deleted,
                hearts,
                userReact,
                body,
                children,
            });
        }

        for (const comment of nestedComments) {
            CommentManager.topLevelComments.push(comment.id);
            getInfoRecursive(comment);
        }
    }

    static getAvatarUrl(baseUrl, userId, size=32, webp=true) {
        const avatarColors = ["purple", "yellow", "orange", "green", "black"];
        if (!baseUrl) {
            const color = userId ? avatarColors[userId % avatarColors.length] : "default-light";
            baseUrl = `https://substack.com/img/avatars/${color}.png`;
        }

        const format = webp ? "f_webp" : "f_auto";
        const sizeParam = `w_${size},h_${size}`;
        const prefix = `https://substackcdn.com/image/fetch/${sizeParam},c_fill,${format},q_auto:good,fl_progressive:steep/`;

        return prefix + encodeURI(baseUrl);
    }

    static getProfileUrl(userId, username) {
        if (!userId || !username) {
            return null;
        }
        const normalizedName = username.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase().trim().replace(/\s+/g, "-").replace(/&/g, "-and-")
            .replace(/[^\w-]+/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
        const slug = userId + (normalizedName ? `-${normalizedName}` : "");
        return `https://substack.com/profile/${slug}`;
    }

    static addComment({
        commentId,
        userId,
        username,
        userPhoto,
        ancestorPath,
        date,
        editedDate=null,
        deleted=false,
        hearts=0,
        userReact=false,
        body,
        children=[]
    }) {
        logFuncCall(true);

        const entry = {
            commentId,
            userId,
            username,
            userPhoto,
            userProfileUrl: CommentManager.getProfileUrl(userId, username),
            ancestorPath,
            parent: parseInt(ancestorPath.split(".").at(-1)) || null,
            date: date ? new Date(date) : date,
            editedDate: editedDate ? new Date(editedDate) : editedDate,
            deleted: deleted || !userId,
            hearts,
            userReact,
            body,
            children,
        };

        for (const [key, value] of Object.entries(entry)) {
            if (value === undefined) {
                throw Error(`addComment(): missing required key ${key}`);
            }
        }

        CommentManager.commentIdToInfo[commentId] = entry;
    }

    static editComment(commentId, body, editedDate) {
        CommentManager.commentIdToInfo[commentId].body = body;
        CommentManager.commentIdToInfo[commentId].editedDate = editedDate;
    }

    static toggleReaction(commentId) {
        const info = CommentManager.commentIdToInfo[commentId];
        if (info.userReact) {
            debug("funcs_CommentManager.toggleReaction", "decreasing like count");
            info.hearts--;
        } else {
            debug("funcs_CommentManager.toggleReaction", "increasing like count");
            info.hearts++;
        }
        info.userReact = !info.userReact;
    }

    static get(commentId) {
        return CommentManager.commentIdToInfo[commentId];
    }
}

class Comment {
    constructor(id, depth=0) {
        this.id = id;
        this.depth = depth;
        this.info = CommentManager.get(this.id);

        const commentTemplate = document.querySelector("#comment-template").content.cloneNode(true);
        this.baseElem = commentTemplate.querySelector(".comment");
        this.contentElem = this.baseElem.querySelector(":scope > .comment-content");
        this.headerElem = this.contentElem.querySelector(".comment-header");
        this.bodyElem = this.contentElem.querySelector(".comment-body");
        this.footerElem = this.contentElem.querySelector(".comment-footer");
        this.textEditContainer = this.contentElem.querySelector(".text-edit-container");
        this.childrenContainer = this.baseElem.querySelector(":scope > .children");

        this.fillCommentElem();
    }

    static months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];

    static formatDateShort(date) {
        if (!date) {
            return "";
        }

        const diffSeconds = (PageInfo.loadDate - date) / 1000;
        const diffMinutes = diffSeconds / 60;
        const diffHours = diffMinutes / 60;
        const diffDays = diffHours / 24;

        if (diffMinutes < 1) {
            return "Just now";
        } else if (diffHours < 1) {
            return `${Math.floor(diffMinutes)}m`;
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)}h`;
        } else if (diffDays < 8) {
            return `${Math.floor(diffDays)}d`;
        } else if (date.getFullYear() === PageInfo.loadDate.getFullYear()) {
            return `${Comment.months[date.getMonth()]} ${date.getDate()}`;
        } else {
            return `${Comment.months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        }
    }

    static formatDateLong(date) {
        if (!date) {
            return "";
        }

        const year = date.getFullYear();
        const month = Comment.months[date.getMonth()];
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes().toString().padStart(2, "0");
        const amPm = hour >= 12 ? "PM" : "AM";
        return `${month} ${day}, ${year}, ${hour > 12 ? hour - 12 : hour}:${minute} ${amPm}`;
    }

    static formatBody(body) {
        if (!body) {
            return "<i>Comment deleted</i>";
        }

        body = body.trim();
        body = body.replace(/\n+/g, "\n");
        body = body.replace(/\b(https?:\/\/[A-Z0-9.-]+\.[A-Z]{2,}([A-Z0-9_.~:\/?#\[\]@!$&'()*+,;=-]*[A-Z0-9_~\/?#\[@$&'(*+,=])?)/gi,
            "<a href='$1' target='_blank' rel='noreferrer'>$1</a>");
        body = body.replace(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
            "<a href='mailto:$1'>$1</a>");

        const paragraphs = body.split(/\n+/);
        return paragraphs.map(p => `<p><span>${p}</span></p>`).join("");
    }

    static createProfilePicture(picture, url, userId) {
        const sizes = [32, 64, 96];
        const sourceSrcset = [];
        const imgSrcset = [];
        for (const size of sizes) {
            sourceSrcset.push(CommentManager.getAvatarUrl(url, userId, size, true) + ` ${size}w`);
            imgSrcset.push(CommentManager.getAvatarUrl(url, userId, size, false) + ` ${size}w`);
        }

        picture.querySelector("source").srcset = sourceSrcset.join(", ");
        const img = picture.querySelector("img");
        img.srcset = imgSrcset.join(", ");
        img.src = CommentManager.getAvatarUrl(url, userId, 96, false);
    }

    fillCommentElem() {    
        const picture = this.contentElem.querySelector(".profile-picture");
        const profileImage = picture.querySelector(".profile-image");
        const userProfileLink = this.contentElem.querySelector(".user-profile-link");
        const username = this.contentElem.querySelector(".username");
        const commentPostDateLink = this.contentElem.querySelector(".comment-post-date-link");
        const commentPostDate = this.contentElem.querySelector(".comment-post-date");
        const commentEdited = this.contentElem.querySelector(".comment-edited");

        this.baseElem.dataset.id = this.id;
        this.baseElem.dataset.depth = this.depth;
        this.baseElem.id = `comment-${this.id}`;

        Comment.createProfilePicture(picture, this.info.userPhoto, this.info.userId);
        profileImage.alt = `${this.info.username}'s avatar`;
        userProfileLink.href = this.info.userProfileUrl;
        username.textContent = this.info.username || "Comment deleted";
        commentPostDateLink.href = `/p/${PageInfo.postName}/comment/${this.id}`;
        commentPostDate.textContent = Comment.formatDateShort(this.info.date);
        commentPostDate.setAttribute("title", Comment.formatDateLong(this.info.date));
        if (this.info.editedDate) {
            commentEdited.textContent = "Edited";
            commentEdited.setAttribute("title", Comment.formatDateLong(this.info.editedDate));
        } else {
            commentEdited.remove();
        }
        this.bodyElem.innerHTML = Comment.formatBody(this.info.body);
        this.baseElem.querySelector(":scope > .collapser").addEventListener("click", () => {
            this.baseElem.classList.toggle("collapsed");
            if (this.baseElem.getBoundingClientRect().top < 0) {
                this.baseElem.scrollIntoView();
            }
        });

        const replyButton = this.footerElem.querySelector(".reply");
        replyButton.addEventListener("click", () => this.replyButtonClick());

        if (PageInfo.userId !== this.info.userId) {
            this.footerElem.querySelector(".edit").remove();
            this.footerElem.querySelector(".delete").remove();
        } else {
            const editButton = this.footerElem.querySelector(".edit");
            editButton.addEventListener("click", () => this.editButtonClick());

            const deleteButton = this.footerElem.querySelector(".delete");
            deleteButton.addEventListener("click", () => this.deleteComment());
        }

        if (this.info.deleted) {
            const profileContainer = this.headerElem.querySelector(".user-profile-link-container");
            profileContainer.insertBefore(username, userProfileLink);
            userProfileLink.remove();
            this.baseElem.classList.add("deleted");
        }

        for (const childId of this.info.children) {
            const child = new Comment(childId, this.depth + 1);
            this.childrenContainer.appendChild(child.baseElem);
        }
    }

    postCommentApi(text) {
        const url = `https://www.astralcodexten.com/api/v1/post/${PageInfo.postId}/comment`;
        const data = {
            body: text,
            parent_id: this.id,
        };
        return apiCall(url, "POST", data);
    }

    async postReply() {
        const replyInput = this.textEditContainer.querySelector(".reply-container .text-input");
        const postReplyButton =
            this.textEditContainer.querySelector(".reply-container .reply-post");
        const errorElem = this.textEditContainer.querySelector(".comment-error");
        const body = replyInput.value;
        replyInput.disabled = true;
        postReplyButton.disabled = true;
        errorElem.classList.remove("visible");

        let data;
        let error;
        try {
            data = await this.postCommentApi(body);
            error = data.errors?.[0]?.msg;
        } catch {
            error = "Post reply failed";
        }

        if (error) {
            debug("commentActionReply", "reply failed:", error);
            replyInput.disabled = false;
            postReplyButton.disabled = false;
            errorElem.textContent = error;
            errorElem.classList.add("visible");
            return;
        }

        debug("commentActionReply", "reply successful", data);
        const newCommentId = data.id;
        const username = data.name;
        const userPhoto = data.photo_url;
        const postDate = new Date(data.date);

        CommentManager.addComment({
            commentId: newCommentId,
            userId: PageInfo.userId,
            username,
            userPhoto,
            ancestorPath: data.ancestor_path,
            date: postDate,
            body,
        });

        const newComment = new Comment(newCommentId);
        this.childrenContainer.appendChild(newComment.baseElem);
        optionManager.processComment(newComment.baseElem);
        this.textEditContainer.replaceChildren();
    }

    replyButtonClick() {
        const replyTemplate = document.querySelector("#reply-template").content.cloneNode(true);
        const replyBase = replyTemplate.querySelector(".reply-container");
        const picture = replyTemplate.querySelector(".profile-picture");
        const profileImage = picture.querySelector(".profile-image");
        const replyInput = replyBase.querySelector(".text-input");
        const postReplyButton = replyBase.querySelector(".reply-post");
        const cancelReplyButton = replyBase.querySelector(".reply-cancel");

        Comment.createProfilePicture(picture, PageInfo.avatarUrl, PageInfo.userId);
        profileImage.alt = `${PageInfo.username}'s avatar`;
        replyInput.addEventListener("input", () => {
            postReplyButton.disabled = replyInput.value === "";
        });
        postReplyButton.addEventListener("click",
            () => this.postReply());
        cancelReplyButton.addEventListener("click", () => {
            replyBase.remove();
            this.baseElem.focus();
        });

        this.textEditContainer.replaceChildren(replyTemplate);
        replyInput.focus();
    }

    editCommentApi(text) {
        const url = `https://www.astralcodexten.com/api/v1/comment/${this.id}`;
        return apiCall(url, "PATCH", {body: text});
    }

    async editComment() {
        const editInput = this.textEditContainer.querySelector(".edit-container .text-input");
        const postEditButton = this.textEditContainer.querySelector(".edit-container .edit-post");
        const errorElem = this.textEditContainer.querySelector(".comment-error");
        const body = editInput.value;
        editInput.disabled = true;
        postEditButton.disabled = true;
        errorElem.classList.remove("visible");

        let data;
        try {
            data = await this.editCommentApi(body);
        } catch (error) {
            debug("commentActionEdit", "edit failed", error);
            editInput.disabled = false;
            postEditButton.disabled = false;
            errorElem.textContent = "Edit post failed";
            errorElem.classList.add("visible");
            return;
        }

        debug("commentActionEdit", "edit successful", data);
        const editDate = new Date(data.edited.date);
        CommentManager.editComment(this.id, body, editDate);
        this.bodyElem.innerHTML = Comment.formatBody(body);

        const editedElem = this.headerElem.querySelector(".comment-edited");

        if (!editedElem) {
            const newEditedElem = document.createElement("div");
            newEditedElem.classList.add("comment-edited");
            newEditedElem.textContent = "Edited";
            newEditedElem.setAttribute("title", Comment.formatDateLong(editDate));
            this.headerElem.querySelector(".comment-post-date-link").after(newEditedElem);
        }

        optionManager.processComment(this.baseElem);
        this.textEditContainer.replaceChildren();
        this.bodyElem.classList.remove("hidden");
        this.footerElem.classList.remove("hidden");
    }

    editButtonClick() {
        const editTemplate = document.querySelector("#edit-template").content.cloneNode(true);
        const editBase = editTemplate.querySelector(".edit-container");
        const editInput = editBase.querySelector(".text-input");
        const postEditButton = editBase.querySelector(".edit-post");
        const cancelEditButton = editBase.querySelector(".edit-cancel");

        editInput.value = this.info.body;
        this.bodyElem.classList.add("hidden");
        this.footerElem.classList.add("hidden");
        editInput.addEventListener("input", () => {
            postEditButton.disabled = editInput.value === "";
        });
        postEditButton.addEventListener("click",
            () => this.editComment());
        cancelEditButton.addEventListener("click", () => {
            editBase.remove();
            this.bodyElem.classList.remove("hidden");
            this.footerElem.classList.remove("hidden");
            this.baseElem.focus();
        });

        this.textEditContainer.replaceChildren(editTemplate);
        editInput.style.height = `${Math.min(Math.max(editInput.scrollHeight, 116), 500) + 2}px`;
        editInput.focus();
    }

    deleteCommentApi() {
        const url = `https://www.astralcodexten.com/api/v1/comment/${this.id}`;
        return apiCall(url, "DELETE");
    }

    async deleteComment() {
        const confirmDelete =
            confirm("Are you sure you want to delete this comment? This action cannot be reversed.");
        if (!confirmDelete) {
            return;
        }

        const userProfileLink = this.contentElem.querySelector(".user-profile-link");
        const profileImage = this.contentElem.querySelector(".profile-image");

        try {
            await this.deleteCommentApi();
        } catch (error) {
            debug("commentActionDelete", "delete failed", error);
            alert("Post deletion failed");
            return;
        }

        this.baseElem.classList.add("deleted");
        this.bodyElem.innerHTML = Comment.formatBody(null);
        const deletedUsername = document.createElement("div");
        deletedUsername.className = "username";
        deletedUsername.textContent = "Comment deleted";
        userProfileLink.replaceWith(deletedUsername);
        profileImage.src = CommentManager.getAvatarUrl(null, null);
        this.footerElem.querySelector(".edit").remove();
        this.footerElem.querySelector(".delete").remove();
    }
}



let optionManager;
let localStorageManager;



// called when the page is first loaded

function addKeyListener() {
    logFuncCall();

    function getKeyCommand(event) {
        if (isMatchingKeyEvent(optionManager.get(OptionKey.prevCommentKey), event)) {
            return KeyCommand.PrevComment;
        } else if (isMatchingKeyEvent(optionManager.get(OptionKey.nextCommentKey), event)) {
            return KeyCommand.NextComment;
        } else if (isMatchingKeyEvent(optionManager.get(OptionKey.prevUnreadKey), event)) {
            return KeyCommand.PrevUnread;
        } else if (isMatchingKeyEvent(optionManager.get(OptionKey.nextUnreadKey), event)) {
            return KeyCommand.NextUnread;
        } else if (isMatchingKeyEvent(optionManager.get(OptionKey.parentKey), event)) {
            return KeyCommand.Parent;
        } else {
            return KeyCommand.Unknown;
        }
    }

    function inView(element) {
        return element.getBoundingClientRect().top > -5;
    }

    function atEntry(element) {
        // scrolling isn't pixel perfect, so include some buffer room
        return Math.abs(element.getBoundingClientRect().top) < 15;
    }

    document.addEventListener("keydown", function(event) {
        // don't trigger when writing
        if (event.target.matches("input, textarea, div[contenteditable='true'], .ProseMirror")) {
            return;
        }
        debug("funcs_onKeydown", "onKeydown(", event, ")");

        if (!optionManager.get(OptionKey.allowKeyboardShortcuts)) {
            return;
        }

        debug("keyPressEvent", event);

        const command = getKeyCommand(event);

        if (command === KeyCommand.Unknown) {
            return;
        }

        let comments;
        const commentContainer = document.querySelector("#top-comment-container");
        if ([KeyCommand.PrevComment, KeyCommand.NextComment, KeyCommand.Parent].includes(command)) {
            comments = commentContainer.querySelectorAll(".comment");
        } else {
            comments = commentContainer.querySelectorAll(".new-comment");
        }

        if (comments.length === 0) {
            return;
        }

        let min = -1;
        let max = comments.length;

        while (max - min > 1) {
            const mid = Math.floor((min + max) / 2);
            debug("keyPressBinary", `${min} ${mid} ${max}`);
            if (inView(comments[mid])) {
                max = mid;
            } else {
                min = mid;
            }
            debug("keyPressBinary", `    mid is now ${mid}`);
        }

        let index;
        if (command === KeyCommand.PrevComment || command === KeyCommand.PrevUnread) {
            index = min;
            index = mod(index, comments.length);
            debug("keyPressBinary", `going backwards, index is min, now ${index}`);
            if (atEntry(comments[index])) {
                index--;
                debug("keyPressBinary", `At entry, decrementing to ${index}`);
            }
        } else if (command === KeyCommand.NextComment || command === KeyCommand.NextUnread) {
            index = max;
            index = mod(index, comments.length);
            debug("keyPressBinary", `going forwards, index is max, now ${index}`);
            if (atEntry(comments[index])) {
                index++;
                debug("keyPressBinary", `At entry, incrementing to ${index}`);
            }
        } else if (command === KeyCommand.Parent) {
            index = max;
            debug("keyPressBinary", `getting parent, index is max, now ${index}`);
            if (index < 0 || index >= comments.length) {
                return;
            }

            const parent = comments[index].parentElement.parentElement;
            if (!parent.classList.contains("comment")) {
                debug("keyPressBinary", "already at top level comment");
                return;
            }

            debug("keyPressBinary", "found parent comment");
            parent.scrollIntoView();
            return;
        }

        // wrap around at the top and bottom
        index = mod(index, comments.length);

        debug("keyPressBinary", `index is ${index}`, comments[index]);
        comments[index].scrollIntoView();
    });
}

async function onStart() {
    logFuncCall();
    debug("pageEvent", "event: onStart");
    optionManager.runOnStartHandlers();
    chrome.storage.onChanged.addListener((changes, namespace) => {
        optionManager.processOptionChange(changes, namespace)
    });
    addKeyListener();
    history.scrollRestoration = "manual";
    window.addEventListener("beforeunload", () => {
        sessionStorage.setItem("scrollY", window.scrollY);
        sessionStorage.setItem("lastPost", location.pathname);
    });
}


// Setup once the DOM is loaded

function createComments() {
    let commentListContainer;
    let commentListItems;
    if (PageInfo.pageType === PageType.Post) {
        const discussion = document.querySelector("#discussion");
        if (!discussion) {
            throw new Error("Cannot find comment container, aborting");
        }
        discussion.tabIndex = -1;
        const topLevelContainer = discussion.querySelector(".comments-page > .container");
        commentListContainer = document.createElement("div");
        commentListContainer.className = "comment-list-container";
        const commentList = document.createElement("div");
        commentList.className = "comment-list";
        commentListContainer.appendChild(commentList);
        commentListItems = document.createElement("div");
        commentListItems.className = "comment-list-items";
        commentListItems.id = "top-comment-container";
        commentList.appendChild(commentListItems);
        topLevelContainer.appendChild(commentListContainer);
    } else if (PageInfo.pageType === PageType.Comments) {
        commentListContainer = document.querySelector(".comment-list-container");
        commentListItems = commentListContainer.querySelector(":scope > * > .comment-list-items");
        commentListItems.replaceChildren();
    }

    for (const commentId of CommentManager.topLevelComments) {
        const comment = new Comment(commentId);
        commentListItems.appendChild(comment.baseElem);
    }

    commentListContainer.classList.add("visible");
}

function fillCommentCounts() {
    if (PageInfo.pageType !== PageType.Post) {
        return;
    }

    const numComments = Object.keys(CommentManager.commentIdToInfo).length;
    const commentCountHeader = document.createElement("div");
    commentCountHeader.classList.add("label");
    commentCountHeader.textContent = numComments;
    const commentCountFooter = commentCountHeader.cloneNode(true);
    const headerCount = document.querySelector(".post-header .post-ufi-comment-button");
    const footerCount = document.querySelector(".post-footer .post-ufi-comment-button");
    headerCount.classList.add("has-label");
    headerCount.classList.remove("no-label");
    footerCount.classList.add("has-label");
    footerCount.classList.remove("no-label");
    headerCount.appendChild(commentCountHeader);
    footerCount.appendChild(commentCountFooter);
}

function handleScroll() {
    if (location.hash) {
        const elem = document.querySelector(location.hash);
        elem?.classList?.add("selected");
        elem?.scrollIntoView({behavior: "instant"});
        return;
    }

    const savedY = sessionStorage.getItem("scrollY");
    const lastPost = sessionStorage.getItem("lastPost");
    if (savedY && lastPost === location.pathname) {
        window.scrollTo({top: parseInt(savedY), behavior: "instant"});
    }
}

async function onLoad() {
    logFuncCall();
    debug("pageEvent", "event: onLoad");

    localStorageManager.set("lastViewedDate", new Date().toISOString());

    if ([PageType.Post, PageType.Comments].includes(PageInfo.pageType)) {
        const template = await loadTemplate(chrome.runtime.getURL("data/templates.html"));
        document.head.appendChild(template.content);
        createComments();
        fillCommentCounts();
        requestAnimationFrame(() => {
            optionManager.processAllComments();
            handleScroll();
        });
    }
}


// actually do the things

async function doAllSetup() {
    optionManager = new OptionManager(OPTION_KEY, OPTIONS);
    await optionManager.init();

    onStart();

    localStorageManager = new LocalStorageManager(LOCAL_DATA_KEY, getPostName());
    const preloads = await getPreloads();
    PageInfo.init(preloads, localStorageManager);

    if (PageInfo.pageType === PageType.Post) {
        CommentManager.init(await getPostComments());
    } else if (PageInfo.pageType === PageType.Comments) {
        CommentManager.init(preloads.initialComments);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onLoad);
    } else {
        onLoad();
    }
}

const runPaths = [
    /^\/$/,
    /^\/p\//,
    /^\/archive$/,
    /^\/about$/,
];

for (const path of runPaths) {
    if (path.test(location.pathname)) {
        doAllSetup();
        break;
    }
}
