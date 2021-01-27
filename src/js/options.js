const OPTIONS = {
    "fixHeader": {
        "priority": 20,
        "default": true,
        "runTime": "start",
        "hovertext": "Keep the header fixed, so it doesn't keep appearing when scrolling up",
    },
    "hideHearts": {
        "priority": 20,
        "default": true,
        "runTime": "start",
        "hovertext": "Hide reactions to comments",
    },
    "useOldStyling": {
        "priority": 30,
        "default": false,
        "runTime": "start",
        "hovertext": "Use styling similar to the old blog",
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
