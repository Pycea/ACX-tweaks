# ACX-tweaks
A browser extension that provides various small improvements to the [Astral Codex Ten](https://astralcodexten.substack.com) blog on [Substack](https://substack.com).

## Compatibility
The extension should work with Firefox and Chrome. Other browsers that use the WebExtension API can probably use it too, but you'll have to figure out how to sideload it youself. Safari is right out.

## Loading instructions
### Firefox
Under [releases](https://github.com/Pycea/ACX-tweaks/releases), download the latest .xpi file (named something like `acx_tweaks-0.6-fx.xpi`). Then just drag the file to any Firefix window and you'll be prompted to add it.

### Chrome/Chromium
Chrome doesn't allow automatically signed extensions, so you'll have to load it as an unpacked extension. Under [releases](https://github.com/Pycea/ACX-tweaks/releases), download the latest `chrome_src.zip` file, and unzip it. You'll end up with a folder called `src`. Then, go to the extensions page (can be accessed at `chrome://extensions`). In the upper right, there should be a toggle labeled "Developer mode". Turn it on, and some buttons will appear on the upper left. Click "Load unpacked", and select the `src` folder. The extension will then be loaded.

## Features
- When collapsing a thread, scrolls to the parent comment
- User configurable options
    - Keeps the header above the post, so it doesn't keep appearing whenever you scroll up a little.
    - Hides reactions (hearts). However, the note that the author liked a given comment is not removed.
    - Shows the full time that a comment was posted, instead of just the day.
    - Adds a button to scroll to the parent comment, or the top of the comment section for top level comments
    - Highlights comments that you haven't seen yet
    - Makes the blog look more like the old blog, [Slate Star Codex](https://web.archive.org/web/20200601140029/https://slatestarcodex.com/).
    - Loads all comments at once, instead of having to keep clicking the "Load more" button.
    - Hides the notification that there are new comments.

To change options, click the extension icon.

## Troubleshooting
### The page loads slowly
If you have the option to load all comments selected, it might cause some lag for large threads. This is a result of Substack comment loading being very laggy.

Additionally, you might notice that going from one post to another is slower with this extension. This is becauase the extension refreshes the page, whereas Substack dynamically loads the content and switches to it. This shouldn't cause much of a noticeable difference in practice unless you're switching pages a lot. However, if you want to disable refreshes, enable the "Load new pages dynamically" setting.

### The full comment dates aren't showing
If you have dynamic page loading enabled, then navigating to another post will break that feature. Refreshing the page will fix it, but there's no other way around that. If you don't have it enabled, try refreshing anyway.

### Only two comments are loaded, with a button that says "4753 new"
This is an issue with Substack. Enabling the load all comments option can fix it, at the cost of loading all the comments.

### Everything is broken
Try refreshing the page. If that doesn't work, click on the extension icon and click on "Reset all data", then click again to confirm. Note that this will reset all data on what comments you have seen, so everything will appear new even if you have seen it before.

## Permissions explanation
### (Firefox) [Access your data for astralcodexten.substack.com](https://support.mozilla.org/en-US/kb/permission-request-messages-firefox-extensions#w_access-your-data-for-named-site)
This is needed to change the look of the site, which is what pretty much all of the options do. This includes adding permalinks, imitating the old theme, and removing the hearts. The only data from the site that is saved is which comments you have seen, if that option is enabled, and only locally.
