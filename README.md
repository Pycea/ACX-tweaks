# ACX-tweaks
A browser extension that provides various small improvements to the [Astral Codex Ten](https://astralcodexten.substack.com) blog on [Substack](https://substack.com).

## Compatibility
The extension works with any browser that can use extensions on the Firefox/Chrome web stores, including Brave and Opera. Other browsers that use the WebExtension API can probably use it too, but you'll have to figure out how to sideload it youself. Safari is right out.

## Loading instructions
### Firefox
Available as a [Firefox extension](https://addons.mozilla.org/en-US/firefox/addon/acx-tweaks/).

### Chrome/Chromium
Available as a [Chrome extension](https://chrome.google.com/webstore/detail/acx-tweaks/jdpghojhfigbpoeiadalafcmohaekglf).

### Other
Under [releases](https://github.com/Pycea/ACX-tweaks/releases), you can get the source from the `chrome_src.zip` file under the latest release. You may be able to do something with this.

## Features
- When collapsing a thread, scrolls to the parent comment
- User configurable options
    - Keeps the header above the post, so it doesn't keep appearing whenever you scroll up a little.
    - Hides reactions (hearts). However, the note that the author liked a given comment is not removed.
    - Shows the full time that a comment was posted, instead of just the day.
    - Adds a button to scroll to the parent comment, or the top of the comment section for top level comments.
    - Applies basic styling to comments, including italics, blockquotes, and Markdown style links.
    - Highlights comments that you haven't seen yet.
    - Makes the blog look more like the old blog, [Slate Star Codex](https://web.archive.org/web/20200601140029/https://slatestarcodex.com/).
    - Loads all comments at once, instead of having to keep clicking the "Load more" button.
    - Hides the notification that there are new comments.

To change options, click the extension icon.

## Custom styling
If you want to do custom styling, including things that take advantage of the extension, you can use the [Stylebot](https://chrome.google.com/webstore/detail/stylebot/oiaejidbmkiecgbjeifoejpgmdaleoha/related?hl=en-US) extension to apply additional changes. For examples of what can be done, see [these](https://github.com/Pycea/ACX-tweaks/issues/3) [three](https://github.com/Pycea/ACX-tweaks/issues/6) [issues](https://github.com/Pycea/ACX-tweaks/issues/7).

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

## Privacy policy
See [here](https://github.com/Pycea/ACX-tweaks/wiki/Privacy-policy). Tl;dr there never is/was/will be any data collection.
