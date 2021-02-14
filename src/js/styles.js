const STYLES = {
    "fixHeader": `
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
        }
        `,
    "hideHearts": `
        .comment-actions span:first-child {
            display: none;
        }

        .comment-actions span:nth-child(2) {
            margin-left: 0 !important;
        }
        `,
    "showFullDate": `
        .comment-meta span:nth-child(2) a:first-child {
            display: none !important;
        }

        .comment-meta span:nth-child(2) a:nth-child(2) {
            display: inline !important;
        }
        `,
    "use24Hour": `
        .hour24-time {
            display: inline !important;
        }

        .hour12-time {
            display: none !important;
        }
        `,
    "addParentLinks": `
        .comment-actions > span:nth-child(2):after {
            display: none !important;
        }
        `,
    "applyCommentStyling": `
        .comment-body span.new-style {
            display: inline !important;
        }

        .comment-body span:not(.new-style) {
            display: none !important;
        }
        `,
    "useOldStyling": `
        /* I am so sorry */

        #entry #main {
            -webkit-font-smoothing: auto !important;
        }

        article div > p {
            color: #333 !important;
            font: 12px/20px Verdana, sans-serif !important;
        }

        h1.post-title.short.unpublished {
            font-size: 16px !important;
            line-height: 1.3em !important;
            margin-bottom: 10px !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            font-family: Georgia, "Bitstream Charter", serif !important;
        }

        td.post-meta-item.post-date {
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

        td.post-meta-item.post-date:before {
            content: "Posted " !important;
        }

        td.post-meta-item.post-date:after {
            content: " by Scott Alexander" !important;
        }

        .single-post {
            border: 1px solid #d5d5d5 !important;
            border-radius: 10px !important;
            background: #fff !important;
            padding: 20px 28px !important;
            margin-bottom: 10px !important;
        }

        .single-post-container {
            background: #f0f0f0 !important;
            padding: 10px 0px !important;
        }

        .single-post a {
            color: #0066cc !important;
            text-decoration: underline !important;
        }

        .post {
            padding: 0 !important;
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

        .subtitle {
            font-size: 12px !important;
            padding-bottom: 8px !important;
        }

        .main-menu .topbar .container .headline {
            text-decoration: none !important;
        }

        .main-menu .topbar .container .headline .name {
            font-size: 43px !important;
            max-height: 100px !important;
            color: white !important;
            font-family: 'Raleway', Open Sans, Arial, sans-serif !important;
            text-align: center !important;
            letter-spacing: 2px !important;
            text-decoration: none !important;
        }

        .topbar {
            background: linear-gradient(to bottom, rgba(139,171,232,1) 0%, rgba(79,115,193,1) 100%) !important;
            text-decoration: none !important;
        }

        button.button.primary.subscribe-cta.subscribe-btn {
            display: none !important;
        }

        .full-container-border {
            display: none !important;
        }

        .comments-page > .container {
            background-color: white !important;
            justify-content: center !important;
            border: 1px solid #d5d5d5 !important;
            border-radius: 10px !important;
            padding: 25px !important;
        }

        .comments-page .container .comments-heading {
            margin-top: 0 !important;
        }

        @media screen and (min-width: 768px) {
            .comments-page > .container {
                width: 675px !important;
            }
        }

        div.buttons.notification-container {
            filter: brightness(3) !important;
            transform: scale(.7) !important;
        }

        img.logo {
            margin-right: 30px !important;
        }

        button.comments-page-sort-menu-button {
            background: transparent !important;
        }

        table.comment-content tr td {
            border: 1px solid #ddd !important;
            padding: 10px !important;
            border-radius: 10px !important;
            flex-grow: 1 !important;
            background: #fafafa !important;
        }

        .highlight-new .comment.new-comment > table.comment-content tr td:not(.comment-head) {
             border: 2px solid #5a5 !important;
        }

        .new-tag {
            color: #c5c5c5 !important;
        }

        table.comment-content tr td.comment-head {
            border: none !important;
            flex-grow: 0 !important;
            background: none !important;
        }

        table tr {
            display: flex !important;
        }

        td.post-meta-item.icon {
            margin-left: 10px !important;
        }

        .comments-page {
            background: #f0f0f0 !important;
            padding-top: 10px !important;
        }

        .comment-meta > span:first-child a {
            font-family: Verdana, sans-serif !important;
            font-weight: bold !important;
            color: black !important;
            text-decoration: none !important;
        }

        .comment-meta > span:first-child  a:after {
            content: " says:" !important;
            font-weight: normal;
            font-style: italic;
        }

        .comment-meta > span:nth-child(2) {
            display: block !important;
            padding-bottom: 10px !important;
            margin-left: 0 !important;
        }

        .comment-meta > span:nth-child(2) a {
            font-family: Georgia, "Bitstream Charter", serif !important;
            color: #888 !important;
            text-decoration: none !important;
        }

        .comment-meta > span:nth-child(2) a:before {
            content: "\\a" !important;
            white-space: pre !important;
        }

        .comment-meta .highlight {
            margin-left: 0 !important;
        }

        .comment-body p {
            font: 12px/20px Verdana, sans-serif !important;
            color: #333 !important;
        }

        .comment-actions span a {
            color: #888 !important;
        }

        .comment.selected > .comment-content > tr > td:nth-child(2) {
            background: #de912d2c !important;
        }

        .comment.selected > .comment-content::before {
            background: inherit !important;
        }

        .profile-img-wrap img {
            border-radius: 0px !important;
            height: 40px !important;
            width: 40px !important;
            position: relative !important;
            right: 8px !important;
        }
        `,
    "hideNew": `
        button.collapsed-reply {
            display: none;
        }

        .comments-page .container .comment-list.has-new-comments {
            padding-top: 12px !important;
        }
        `,
}
