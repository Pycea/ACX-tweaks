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
    "resetData": {
        "default": false,
        "type": "oneshot",
        "priority": 0,
        "runTime": "never",
        "reprocessCommentsOnChange": false,
        "hovertext": "Reset all extension data. Use if something breaks that refreshing doesn't fix. Will delete data about which comments have been seen.",
    },
};
