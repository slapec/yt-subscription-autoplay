# This project does not work anymore
Thank you for killing [collections](https://support.google.com/youtube/answer/6233832?hl=en)

## youtube-subscription-autoplay
Play videos automatically in your Youtube subscription feed.

### How?
#### Using a bookmarklet
1. Add the bookmarklet below to your bookmarks:
```javascript
javascript:(function(){var tag=document.createElement('script');tag.src='https://cdn.rawgit.com/slapec/yt-subscription-autoplay/master/dist/yt-subscription-autoplay.min.js';document.body.appendChild(tag)})()
```
2. Open a [collection](https://support.google.com/youtube/answer/3123405) on Youtube
    - The script works in collections only *at the moment*
3. Use the bookmarklet
4. \o/

#### Using your keyboard and mouse
1. Copy the code from above
2. Open a [collection](https://support.google.com/youtube/answer/3123405) on Youtube
    - The script works in collections only *at the moment*
3. Open the debug console
    - In Chrome: press CTRL+Shift+J or F12 > Console tab
    - In Firefox: press CTRL+Shift+K or F12 > Console tab
4. Paste the code then press enter

Files are serverd by [rawgit](https://rawgit.com)

### Why?
Let's say you are subscribed to several music channels (like me) and you'd like to listen all the new releases without touching the browser. Then this script is for you.
