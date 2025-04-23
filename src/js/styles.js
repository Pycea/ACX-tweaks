"use strict";

const STYLES = {
    "fixHeader": {
        "css": `
            .main-menu > * {
                position: relative !important;
                top: 0 !important;
            }

            .comment .comment-anchor {
                top: 0 !important;
            }`,
    },
    "zenMode": {
        "css": `
            [data-testid="noncontributor-cta-button"],
            .post-ufi,
            .available-content ~ *,
            .single-post-section,
            .publication-footer,
            .subscribe-footer {
                display: none;
            }

            .post-header > .pencraft > .pencraft:first-child,
            .available-content {
                border-bottom: var(--border-default);
            }
        `,
    },
    "removeComments": {
        "css": `
            #discussion {
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
            .comment-content .worse-date {
                display: none;
            }

            .comment-content .better-date {
                display: block;
            }

            .comment-content .worse-edited-date {
                display: none;
            }

            .comment-content .better-edited-date {
                display: block;
            }

            .better-edited-date div {
                display: inline;
            }`,
    },
    "use24Hour": {
        "css": `
            .comment-header .hour24-time {
                display: inline;
            }

            .comment-header .hour12-time {
                display: none;
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
                display: inline;
            }

            .comment-body span.old-style {
                display: none;
            }`,
    },
    "smoothScroll": {
        "css": `
            html {
                scroll-behavior: smooth;
            }
        `,
    },
    "useOldStyling": {
        "css": `
            /* Global default font and look */

            :root {
                --web_bg_color: #ffffff;
                background-color: #f0f0f0 !important;
            }

            html body {
                cursor: auto;
            }

            #entry #main {
                -webkit-font-smoothing: auto;
            }



            /* Topbar */

            .main-menu > :first-child {
                background: linear-gradient(to bottom, rgba(139,171,232,1) 0%, rgba(79,115,193,1) 100%);
                text-decoration: none;
            }

            .main-menu > :first-child > :first-child {
                align-items: center;
                gap: 30px;
                height: 112px !important;
                padding: 20px;
            }

            .main-menu > :first-child > :first-child > :first-child > a > div {
                justify-self: end;
            }

            .main-menu > :first-child > :first-child > :first-child > a > div > div,
            .main-menu > :first-child > :first-child > :first-child img {
                width: 60px !important;
                height: 60px !important;
            }

            .main-menu > :first-child > :first-child > :nth-child(2) {
                color: white;
            }

            .main-menu > :first-child > :first-child > :nth-child(3) {
                align-self: start;
            }

            .main-menu h1 {
                font-size: 64px;
                font-family: 'Raleway', Open Sans, Arial, sans-serif;
                font-weight: normal;
                text-align: center;
                letter-spacing: 2px;
                line-height: unset;
                -webkit-font-smoothing: auto;
            }

            .main-menu h1 a {
                color: white;
            }

            .main-menu > :not(:first-child) {
                display: none;
            }

            #trigger5 div,
            #dialog6 div {
                outline: none;
            }

            @media screen and (max-width: 1100px) {
                .main-menu h1 {
                    font-size: 48px;
                }

                .main-menu > :first-child > :first-child {
                    height: 99px !important;
                }

                .main-menu > :first-child > :first-child > :first-child > a > div > div,
                .main-menu > :first-child > :first-child > :first-child img {
                    width: 44px !important;
                    height: 44px !important;
                }
            }

            @media screen and (max-width: 950px) {
                .main-menu h1 {
                    font-size: 24px;
                }

                .main-menu > :first-child > :first-child {
                    height: 70px !important;
                }


                .main-menu > :first-child > :first-child > :first-child > a > div > div,
                .main-menu > :first-child > :first-child > :first-child img {
                    width: 32px !important;
                    height: 32px !important;
                }
            }



            /* Title and post info */

            .post-title {
                font-size: 16px;
                line-height: 1.3em;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-family: Georgia, "Bitstream Charter", serif;
                font-weight: normal;
                -webkit-font-smoothing: auto;
            }

            .subtitle {
                font: 12px/20px Verdana, sans-serif;
                padding-bottom: 8px;
            }

            .subtitle + div > :first-child > div > div > div > div {
                display: inline;
                padding: 5px 7px;
                margin-right: 16px;
                color: #888;
                font-size: 10px;
                font-family: Verdana, sans-serif;
                letter-spacing: 1px;
                background: #f9f9f9;
                border: 1px solid #eee;
                text-transform: uppercase;
                text-shadow: 1px 1px 1px #fff;
            }

            .subtitle + div > :first-child > div > div > div > div:before {
                content: "Posted on ";
            }

            .subtitle + div > :first-child > div > div > div > div:after {
                content: " by Scott Alexander";
            }



            /* Post content */

            .single-post-container {
                background: #f0f0f0;
                padding: 10px 0px;
            }

            @media screen and (min-width: 800px) {
                .single-post-container > .container {
                    margin: 0 auto;
                    width: 780px;
                }
            }

            .single-post {
                border: 1px solid #d5d5d5;
                border-radius: 10px;
                background: #fff;
                padding: 20px 28px;
                margin-bottom: 10px;
            }

            article {
                padding: 0;
            }

            #main .post-header > .pencraft > .pencraft:first-child,
            article .available-content {
                border-bottom: none;
            }

            article .available-content p,
            article .available-content li {
                color: #333;
                font: 12px/20px Verdana, sans-serif;
            }

            figcaption {
                font: 12px/20px Verdana, sans-serif;
            }

            article .available-content p a {
                color: #0066cc;
                text-decoration: underline;
            }

            article .available-content blockquote,
            #discussion .comment blockquote {
                border-left: 4px solid #ddd;
                margin: 0 2em;
                padding: 0 1em;
                font-size: 13px;
            }

            article .available-content blockquote p,
            #discussion blockquote {
                margin-left: 0;
                font-family: Georgia, "Bitstream Charter", serif;
                font-style: italic;
                line-height: 24px;
            }



            /* Comments container */

            #discussion {
                gap: 0;
            }

            #discussion > :first-child > h4 {
                margin-top: 0;
                font-family: Georgia, "Bitstream Charter", serif;
                font-size: 16px;
                font-weight: normal;
                letter-spacing: 1px;
                text-transform: uppercase;
            }

            .comments-page > .container {
                box-sizing: border-box;
                background-color: white;
                justify-content: center;
                border: 1px solid #d5d5d5;
                border-radius: 10px;
                padding: 17px;
            }

            @media screen and (min-width: 800px) {
                #discussion > .container,
                .comments-page > .container {
                    width: 780px;
                }
            }



            /* Comment box form */

            [data-test-id="comment-input"] form {
                margin-bottom: 16px;
            }

            [data-test-id="comment-input"] form > div:first-child,
            [data-test-id="comment-input"] form > div:first-child div,
            [data-test-id="comment-input"] form img {
                border-radius: 0px;
                height: 41px;
                width: 41px;
                outline: none;
            }

            .comment-list-items .comment {
                margin-top: 0;
            }

            .comment-list-items .comment .children {
                padding-left: calc(41px + 12px);
                margin-bottom: 0;
            }

            .comment-content .comment-main {
                border: 1px solid #ddd;
                padding: 4px 10px;
                border-radius: 10px;
                flex-grow: 1;
                background: #fafafa;
                box-sizing: border-box;
            }

            .comment-content .comment-header {
                border: none;
                flex-grow: 0;
                background: none;
            }

            .profile-image {
                border-radius: 0px;
                height: 41px;
                width: 41px;
                position: relative;
                outline: none;
            }

            .collapser {
                width: 41px;
                top: 41px;
                padding-top: 8px;
                height: calc(100% - 41px - 12px - 8px);
            }

            .collapser .line {
                background-color: #ccc;
            }

            .collapser:hover .line {
                box-shadow: inset 1px 0 #aaa;
            }



            /* Comment meta */

            .comment-header {
                display: initial;
            }

            .comment-header a {
                display: inline-block;
            }

            .comment-header div {
                font-size: 12px;
            }

            .comment-header .username {
                display: block;
                margin-bottom: 2px;
                font-family: Verdana, sans-serif;
                font-weight: bold;
                line-height: 24px;
                color: black;
                text-decoration: none;
            }

            .comment-header .user-profile-link .username:after {
                content: " says:";
                font-weight: normal;
                font-style: italic;
                color: #333;
            }

            .comment-header .comment-post-date,
            .comment-header .comment-edited {
                font-family: Georgia, "Bitstream Charter", serif;
                color: #888;
                text-decoration: none;
            }



            /* Comment content */

            .comment .comment-body {
                margin-top: 10px;
                overflow-y: visible;
            }

            .comment-body p {
                font: 12px/24px Verdana, sans-serif;
                color: #333;
            }

            .comment-body a {
                color: #0066cc;
                text-decoration: underline;
            }

            .comment-body a:hover {
                color: #ff4b33;
            }

            .comment-body i {
                display: none;
            }



            /* Comment actions */

            .comment-footer {
                gap: 12px;
            }

            .comment-footer button {
                margin-top: 4px;
                margin-bottom: 7px;
                color: #888 !important;
                font-family: Georgia, "Bitstream Charter", serif;
                font-size: 12px;
                line-height: normal;
                text-transform: capitalize;
                text-decoration: underline;
            }

            .text-input-container {
                margin-bottom: 4px;
            }

            .text-input-container textarea {
                font: 12px/20px Verdana, sans-serif;
                color: #333;
            }



            /* New comments */

            .highlight-new .comment.new-comment > .comment-content .comment-main {
                outline: 2px solid #5a5;
                outline-offset: -1px;
            }

            .highlight-new .comment .comment-header .new-tag-text {
                display: none;
            }



            /* Black sorcery */

            body {
                overflow-y: hidden !important;
            }`,
    },
}
