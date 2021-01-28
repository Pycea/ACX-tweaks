const OPTIONS = {
    "fixHeader": {
        "priority": 20,
        "default": true,
        "runTime": "start",
        "hovertext": "Keep the header fixed, so it doesn't keep appearing when scrolling up",
    },
    "hideHearts": {
        "priority": 40,
        "default": true,
        "runTime": "start",
        "hovertext": "Hide reactions to comments",
    },
    "showFullDate": {
        "priority": 30,
        "default": true,
        "runTime": "start",
        "hovertext": "Show the full date and time when a comment was posted",
    },
    "useOldStyling": {
        "priority": 50,
        "default": false,
        "runTime": "start",
        "hovertext": "Use styling similar to the old blog",
    },
    "highlightNew": {
        "priority": 30,
        "default": false,
        "runTime": "start",
        "hovertext": "Highlight comments that you haven't seen yet",
    },
    "loadAll": {
        "priority": 10,
        "default": false,
        "runTime": "end",
        "hovertext": "Load all comments preemptively",
    },
    "hideNew": {
        "priority": 20,
        "default": false,
        "runTime": "start",
        "hovertext": "Prevent new comments from showing up dynamically (for technical reasons only works properly when loading all comments)",
    },
};
