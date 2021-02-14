const OPTIONS = {
    "fixHeader": {
        "default": true,
        "type": "toggle",
        "priority": 20,
        "runTime": "start",
        "reprocessCommentsOnChange": false,
        "hovertext": "Keep the header fixed, so it doesn't keep appearing when scrolling up",
    },
    "hideHearts": {
        "default": true,
        "type": "toggle",
        "priority": 40,
        "runTime": "start",
        "reprocessCommentsOnChange": false,
        "hovertext": "Hide reactions to comments",
    },
    "showFullDate": {
        "default": true,
        "type": "toggle",
        "priority": 30,
        "runTime": "start",
        "reprocessCommentsOnChange": true,
        "hovertext": "Show the full date and time when a comment was posted",
    },
    "use24Hour": {
        "default": false,
        "type": "toggle",
        "priority": 30,
        "runTime": "start",
        "reprocessCommentsOnChange": false,
        "hovertext": "Use 24 hour time for the full date",
    },
    "highlightNew": {
        "default": true,
        "type": "toggle",
        "priority": 30,
        "runTime": "start",
        "reprocessCommentsOnChange": false,
        "hovertext": "Highlight comments that you haven't seen yet",
    },
    "newTime": {
        "default": 0,
        "type": "toggle",
        "priority": 30,
        "runTime": "start",
        "reprocessCommentsOnChange": true,
        "hovertext": "Comments posted within this time period will also be marked as new",
    },
    "addParentLinks": {
        "default": true,
        "type": "toggle",
        "priority": 30,
        "runTime": "start",
        "reprocessCommentsOnChange": true,
        "hovertext": "Add links to scroll to the parent comment, or the top of the comments page for top level comments",
    },
    "applyCommentStyling": {
        "default": true,
        "type": "toggle",
        "priority": 30,
        "runTime": "start",
        "reprocessCommentsOnChange": true,
        "hovertext": "Apply basic styling to comments (italics, block quotes, and Markdown style text links)",
    },
    "useOldStyling": {
        "default": false,
        "type": "toggle",
        "priority": 50,
        "runTime": "start",
        "reprocessCommentsOnChange": false,
        "hovertext": "Use styling similar to the old blog",
    },
    "loadAll": {
        "default": false,
        "type": "toggle",
        "priority": 10,
        "runTime": "end",
        "reprocessCommentsOnChange": false,
        "hovertext": "Load all comments preemptively",
    },
    "hideNew": {
        "default": false,
        "type": "toggle",
        "priority": 20,
        "runTime": "start",
        "reprocessCommentsOnChange": false,
        "hovertext": "Prevent new comments from showing up dynamically (for technical reasons only works properly when loading all comments)",
    },
    "dynamicLoad": {
        "default": false,
        "type": "toggle",
        "priority": 10,
        "runTime": "end",
        "reprocessCommentsOnChange": false,
        "hovertext": "Dynamically load content when switching between posts (default Substack behavior). Enabling can decrease load times, but may break some functionality.",
    },
    "allowKeyboardShortcuts": {
        "default": true,
        "type": "toggle",
        "priority": 10,
        "runTime": "never",
        "reprocessCommentsOnChange": false,
        "hovertext": "Enable keyboard shortcuts for the various actions below",
    },
    "smoothScroll": {
        "default": true,
        "type": "toggle",
        "priority": 10,
        "runTime": "never",
        "reprocessCommentsOnChange": false,
        "hovertext": "Smoothly scroll when moving between comments (disable this to jump directly to the next comment)",
    },
    "prevCommentKey": {
        "default": {
            "key": 73,
            "control": false,
            "alt": false,
            "shift": false,
            "meta": false,
        },
        "type": "key",
        "priority": 10,
        "runTime": "never",
        "reprocessCommentsOnChange": false,
        "hovertext": "Key/key combo to move to the previous comment (click the box to set)",
    },
    "nextCommentKey": {
        "default": {
            "key": 85,
            "control": false,
            "alt": false,
            "shift": false,
            "meta": false,
        },
        "type": "key",
        "priority": 10,
        "runTime": "never",
        "reprocessCommentsOnChange": false,
        "hovertext": "Key/key combo to move to the next comment (click the box to set)",
    },
    "prevUnreadKey": {
        "default": {
            "key": 75,
            "control": false,
            "alt": false,
            "shift": false,
            "meta": false,
        },
        "type": "key",
        "priority": 10,
        "runTime": "never",
        "reprocessCommentsOnChange": false,
        "hovertext": "Key/key combo to move to the previous new comment (click the box to set)",
    },
    "nextUnreadKey": {
        "default": {
            "key": 74,
            "control": false,
            "alt": false,
            "shift": false,
            "meta": false,
        },
        "type": "key",
        "priority": 10,
        "runTime": "never",
        "reprocessCommentsOnChange": false,
        "hovertext": "Key/key combo to move to the next new comment (click the box to set)",
    },
    "resetData": {
        "default": false,
        "type": "unused",
        "priority": 0,
        "runTime": "never",
        "reprocessCommentsOnChange": false,
        "hovertext": "Reset all extension data. Use if something breaks that refreshing doesn't fix. Will delete data about which comments have been seen. You must be on the ACX site for this to work.",
    },
};
