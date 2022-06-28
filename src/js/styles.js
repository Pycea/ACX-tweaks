"use strict";

const STYLES = {
    "fixHeader": {
        "css": `
            .main-menu-content {
                position: relative !important;
                top: 0 !important;
            }

            .main-menu .backdrop {
                position: fixed !important;
            }

            .topbar-replacement {
                display: none;
            }

            .comment .comment-anchor {
                top: 0 !important;
            }`,
    },
    "hideBadge": {
        "css": `
            .profile-img-badge {
                display: none;
            }
        `,
    },
    "hideSubOnlyPosts": {
        "css": `
            .sub-post {
                display: none;
            }`,
    },
    "removeComments": {
        "css": `
            .comments-page {
                display: none;
            }

            .post-footer > .post-meta tr td:nth-child(2) {
                display: none;
            }
        `,
    },
    "showHearts": {
        "css": `
            .comment-heart {
                display: none;
            }
        `,
    },
    "showFullDate": {
        "css": `
            .comment-meta a.worse-date {
                display: none !important;
            }

            .comment-meta a.better-date {
                display: initial !important;
            }

            .comment-meta .edited-indicator {
                display: none !important;
            }

            .comment-meta .better-edited-indicator {
                display: initial !important;
            }`,
    },
    "use24Hour": {
        "css": `
            .hour24-time {
                display: inline !important;
            }

            .hour12-time {
                display: none !important;
            }`,
    },
    "addParentLinks": {
        "css": `
            .parent-link {
                display: none;
            }`,
    },
    "applyCommentStyling": {
        "css": `
            .comment-body span.new-style {
                display: inline !important;
            }

            .comment-body span.old-style {
                display: none !important;
            }`,
    },
    "useOldStyling": {
        "css": `

            /* Global default font and look */

            :root {
                --web_bg_color: #ffffff !important;
                --background_contrast_1: #f7f7f7 !important;
                --background_contrast_2: #ededed !important;
                --background_contrast_3: #d6d6d6 !important;
            }

            html {
                background: #f0f0f0 !important;
            }

            #entry #main {
                -webkit-font-smoothing: auto !important;
                background-color: #f0f0f0 !important;
            }



            /* Topbar */

            .main-menu-content .topbar-content {
                background: linear-gradient(to bottom, rgba(139,171,232,1) 0%, rgba(79,115,193,1) 100%) !important;
                text-decoration: none !important;
            }

            .topbar-content .navbar-title {
                font-size: 43px !important;
                max-height: 100px !important;
                font-family: 'Raleway', Open Sans, Arial, sans-serif !important;
                font-weight: normal !important;
                text-align: center !important;
                letter-spacing: 2px !important;
                text-decoration: none !important;
                -webkit-font-smoothing: auto !important;
            }

            .topbar-content .navbar-title .navbar-title-link {
                color: white !important;
            }

            .topbar-spacer {
                display: none;
            }

            .subscribe-cta.subscribe-btn {
                display: none !important;
            }

            .notification-container {
                transform: scale(.8) !important;
            }



            /* Title and post info */

            .post-title {
                font-size: 16px !important;
                line-height: 1.3em !important;
                margin-bottom: 10px !important;
                text-transform: uppercase !important;
                letter-spacing: 1px !important;
                font-family: Georgia, "Bitstream Charter", serif !important;
                font-weight: normal !important;
                -webkit-font-smoothing: auto !important;
            }

            .subtitle {
                font: 12px/20px Verdana, sans-serif !important;
                padding-bottom: 8px !important;
            }

            .publish-context > time {
                color: #888 !important;
                font-size: 10px !important;
                font-family: Verdana, sans-serif !important;
                letter-spacing: 1px !important;
                background: #f9f9f9 !important;
                border: 1px solid #eee !important;
                padding: 5px 7px !important;
                display: inline !important;
                text-transform: uppercase !important;
                text-shadow: 1px 1px 1px #fff !important;
            }

            .publish-context > time:before {
                content: "Posted on " !important;
            }

            .publish-context > time:after {
                content: " by Scott Alexander" !important;
            }

            .publish-context > time {
                margin-right: 16px !important;
            }



            /* Post content */

            .single-post-container {
                background: #f0f0f0 !important;
                padding: 10px 0px !important;
            }

            @media screen and (min-width: 800px) {
                .single-post-container > .container {
                    margin: 0 auto;
                    width: 780px;
                }
            }

            .single-post {
                border: 1px solid #d5d5d5 !important;
                border-radius: 10px !important;
                background: #fff !important;
                padding: 20px 28px !important;
                margin-bottom: 10px !important;
            }

            article {
                padding: 0 !important;
            }

            article .available-content p, article .available-content li {
                color: #333 !important;
                font: 12px/20px Verdana, sans-serif !important;
            }

            figcaption {
                font: 12px/20px Verdana, sans-serif !important;
            }

            article .available-content p > a {
                color: #0066cc !important;
                text-decoration: underline !important;
            }

            blockquote {
                border-left: 4px solid #ddd !important;
                margin: 0 2em !important;
                padding: 0 1em !important;
            }

            blockquote p {
                margin-left: 0 !important;
                font-family: Georgia, "Bitstream Charter", serif !important;
                font-style: italic !important;
                font-size: 13px !important;
                line-height: 24px !important;
                color: #333 !important;
            }



            /* Comments container */

            .comments-page-sort-menu-button {
                background: transparent !important;
            }

            .comments-page-sort-menu-dropdown a {
                font: 12px/20px Verdana, sans-serif !important;
                padding-top: 6px !important;
                padding-bottom: 6px !important;
            }

            .full-container-border {
                display: none !important;
            }

            .comments-page {
                background: #f0f0f0 !important;
                padding-top: 10px !important;
            }

            .comments-page > .container {
                box-sizing: border-box !important;
                background-color: white !important;
                justify-content: center !important;
                border: 1px solid #d5d5d5 !important;
                border-radius: 10px !important;
                padding: 17px !important;
            }

            .comments-page .comments-heading {
                margin-top: 0 !important;
                font-family: Georgia, "Bitstream Charter", serif !important;
                font-size: 16px !important;
                font-weight: normal !important;
                letter-spacing: 1px !important;
                text-transform: uppercase;
            }

            .comments-page .comment-input-head {
                padding-top: 0 !important;
            }

            .comments-page .comment-input-right {
                margin-left: 8px !important;
            }

            @media screen and (min-width: 800px) {
                .comments-page > .container {
                    width: 780px !important;
                }
            }



            /* Comment box form */

            .comment-content .comment-rest {
                border: 1px solid #ddd;
                padding: 10px !important;
                border-radius: 10px !important;
                flex-grow: 1 !important;
                background: #fafafa !important;
                box-sizing: border-box !important;
            }

            .comment-content .comment-head {
                border: none !important;
                flex-grow: 0 !important;
                background: none !important;
            }

            .comment-content tr {
                display: flex !important;
            }

            .profile-img-wrap img {
                border-radius: 0px !important;
                height: 41px !important;
                width: 41px !important;
                position: relative !important;
            }

            .profile-img-wrap div.profile-img-badge {
                right: -6px !important;
            }

            .comment > .comment-list-collapser {
                top: 42px !important;
                padding-top: 18px !important;
                padding-left: 20px !important;
                height: calc(100% - 67px) !important;
            }

            .comment > .comment-list-collapser:hover .comment-list-collapser-line {
                box-shadow: inset 1px 0 #aaa !important;
            }



            /* Comment meta */

            .comment-meta {
                display: initial !important;
            }

            .comment-meta > .commenter-name, .comment-meta > .commenter-publication, .comment-meta > .highlight {
                display: block;
            }

            .comment-meta .commenter-name {
                font-family: Verdana, sans-serif !important;
                font-weight: bold !important;
                color: black !important;
                text-decoration: none !important;
            }

            .comment-meta .commenter-name:after {
                content: " says:" !important;
                font-weight: normal !important;
                font-style: italic;
                color: #333 !important;
            }

            .comment-meta > a, .comment-meta > span:not(.commenter-name):not(.highlight) {
                font-family: Georgia, "Bitstream Charter", serif !important;
                color: #888 !important;
                text-decoration: none !important;
                padding-top: 4px !important;
            }

            .comment-meta .comment-publication-name-separator {
                display: none !important;
            }

            .comment-meta .edited-indicator, .comment-meta .better-edited-indicator {
                padding-left: 15px;
            }

            .comment-meta .highlight {
                margin-left: 0 !important;
            }

            .profile-hover-card-container {
                transform-origin: top left !important;
                transform: scale(.8) !important;
            }



            /* Comment content */

            .comment .comment-body {
                max-height: 620px;
                padding-top: 8px;
            }

            .comment-body p {
                font: 12px/20px Verdana, sans-serif !important;
                color: #333 !important;
            }

            .comment-body .comment_notice {
                font: 12px/20px Verdana, sans-serif !important;
            }

            .comment.one-liner .comment-body {
                display: block !important;
                font: 12px/20px Verdana, sans-serif !important;
            }

            .comment-body .show-all-toggle {
                background: linear-gradient(#fafafa00 0%, #fafafa 75%, #fafafa 100%) !important;
            }



            /* Comment actions */

            .comment .comment-actions {
                color: #888 !important;
                display: block;
            }

            .comment.one-liner > .comment-content .comment-actions {
                display: block !important;
                margin-left: 0 !important;
                margin-top: 6px !important;
            }

            .tooltip-portal .dropdown-menu a {
                font: 12px/20px Verdana, sans-serif !important;
                padding-top: 6px !important;
                padding-bottom: 6px !important;
            }



            /* New comments */

            .highlight-new .comment.new-comment > .comment-content .comment-rest {
                border: 2px solid #5a5;
            }

            .new-tag-text {
                color: #c5c5c5 !important;
            }



            /* Selected comment */

            .comment.selected > .comment-content .comment-rest {
                background: #de912d2c !important;
            }

            .comment.selected > .comment-content::before {
                background: inherit !important;
            }



            /* Black sorcery */

            body {
                overflow-y: hidden !important;
            }`,
    },
    "hideNew": {
        "css": `
            button.new-comments {
                display: none;
            }

            .comment-list-container .comment-list.has-new-comments {
                padding-top: 12px !important;
            }`,
    },
    "hideUsers": {
        "css": `
            .hidden-post {
                display: none;
            }
        `,
    },
}
