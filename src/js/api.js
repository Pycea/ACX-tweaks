"use strict";

class API {
    static getPostData(postName) {
        logFuncCall();
        const url = `https://www.astralcodexten.com/api/v1/posts/${getPostName()}`;
        return API.call(url);
    }

    static async getPostComments(postId, order) {
        logFuncCall();
        const sort = order === SortOrder.NewFirst ? "most_recent_first" : "oldest_first";
        const url = `https://www.astralcodexten.com/api/v1/post/${postId}/comments?block=false&sort=${sort}&all_comments=true`;
        const data = await API.call(url);
        return data.comments;
    }

    static postComment(postId, parentId, text) {
        const url = `https://www.astralcodexten.com/api/v1/post/${postId}/comment`;
        const data = {
            body: text,
            parent_id: parentId,
        };
        return API.call(url, "POST", data);
    }

    static editComment(commentId, text) {
        const url = `https://www.astralcodexten.com/api/v1/comment/${commentId}`;
        const data = {
            body: text,
        }
        return API.call(url, "PATCH", data);
    }

    static deleteComment(commentId) {
        const url = `https://www.astralcodexten.com/api/v1/comment/${commentId}`;
        return API.call(url, "DELETE");
    }

    static setReaction(commentId, method) {
        logFuncCall();
        const url = `https://www.astralcodexten.com/api/v1/comment/${commentId}/reaction`;
        const data = {reaction: "❤"};
        return API.call(url, method, data);
    }

    static likeComment(commentId) {
        logFuncCall();
        return API.setReaction(commentId, "POST");
    }

    static unlikeComment(commentId) {
        logFuncCall();
        return API.setReaction(commentId, "DELETE");
    }

    static reportUser(postId, commentId, details, category) {
        const url = `https://www.astralcodexten.com/api/v1/comment/${commentId}/report`;
        const data = {
            "publication_id": postId,
            "details": details,
            "reportCategory": category,
            "reportedToSubstack": category != null,
        };
        return API.call(url, "POST", data);
    }

    static call(url, method="GET", data={}, timeout=10) {
        logFuncCall();
        debug("fetchCall", url, data, method);
        const options = {
            method: method,
            headers: {"Content-Type": "application/json"},
            signal: AbortSignal.timeout(timeout * 1000),
        };
        if (method !== "GET" && method !== "HEAD") {
            options.body = JSON.stringify(data);
        }
        return fetch(url, options)
            .then(response => response.json())
            .then((data) => {
                debug("fetchResponse", data);
                return data;
            })
            .catch((error) => {
                debug("fetchError", error);
                throw error;
            });
    }
}
