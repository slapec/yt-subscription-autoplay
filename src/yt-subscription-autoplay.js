/* global YT */
/* global yt */
//@ sourceURL=yt-dev.js
(function(){
    'use strict';
    var IFRAME_API_PATH = 'https://www.youtube.com/iframe_api';
    var MARK_WATCHED_PATH = 'https://www.youtube.com/user_watch?video_id=';
    var GET_VIDEO_INFO_PATH = 'https://www.youtube.com/get_video_info?video_id=';

    var SENTIMENT = {
        NONE: 2,
        DISLIKE: 1,
        LIKE: 0
    };

    var STYLESHEET =
        'body {margin: 0}' +
        'iframe {display: none; margin: auto}' +
        'table {border-collapse: collapse; width: 100%}' +
        'tr {cursor: pointer; border-right: 6px solid #A7EF91}' +
        'tr:nth-child(even) {background: #F3F3F3}' +
        'tr:hover {background: #A7EF91}' +
        '.control-right {float: right; margin-left: 2px}' +
        '.control-left {float: left; margin-right: 2px}' +
        '.watched {border-right: 6px solid #F9CD5D}' +
        '.now-playing {background: #A7EF91!important}' +
        '.player-full {position: fixed; top: 0; left: 0; right: 0; background: rgba(0, 0, 0, .5); padding: 4px}' +
        '#seekBar {display: block; width: 100%; margin: auto}' +
        '#playButton {width: 45px}';

    var updaterId = null;
    var videoList = {};
    var controls = {};
    var nowPlaying;

    var body;
    var playlist;

    var playbackMethods = {
        unwatched: function(){
            var videoIds = Object.keys(videoList);

            var videoIndex = 0;
            for(videoIndex; videoList[videoIds[videoIndex]].watched; videoIndex++){}
            return videoIds[videoIndex];
        },
        inOrder: function(){
            var videoIds = Object.keys(videoList);
            var actual = videoIds.indexOf(nowPlaying);
            return videoIds[actual + 1];
        }
    };

    var getNextVideoId = playbackMethods.unwatched;

    var getFeedURI = function(){
      var parts = window.location.pathname.split('/');
      return parts[parts.length - 1];
    };

    var getParameterByName = function(_key, data){
        // Original source: http://stackoverflow.com/a/901144/1069572
        var key = _key.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
        var results = regex.exec(data);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    var setupLikeButton = function(){
        var path = GET_VIDEO_INFO_PATH + nowPlaying;

        sAjax(path, function (data) {
            var sentiment = parseInt(getParameterByName('sentiment', data));

            if(sentiment === SENTIMENT.LIKE){
                controls.likeButton.element.value = controls.likeButton.icons.full;
                controls.likeButton.full = true;
            }
            else {
                controls.likeButton.element.value = controls.likeButton.icons.empty;
                controls.likeButton.full = false;
            }
        }, false);
    };

    var createPlaylistElement = function(video){
        var row = document.createElement('tr');
        row.id = video.videoId;

        row.onclick = function(){
            window.player.loadVideoById(video.videoId);
        };

        if(video.watched){
            row.classList.add('watched');
        }

        var time = document.createElement('td');
        row.appendChild(time);
        time.innerHTML = video.time;

        var title = document.createElement('td');
        row.appendChild(title);
        title.innerHTML = video.title;

        return row;
    };

    var createPlayerControls = function(){
        var createOption = function(text){
            var option = document.createElement('option');
            option.text = text;
            return option;
        };

        var controlsDiv = document.createElement('div');
        controlsDiv.id = 'controls';

        var toggleVideo = document.createElement('input');
        controls.toggleVideo = {showVideo: false};
        toggleVideo.id = 'toggleVideo';
        toggleVideo.type = 'button';
        toggleVideo.classList.add('control-right');
        toggleVideo.value = 'Toggle video';
        toggleVideo.onclick = function(){
            controls.toggleVideo.showVideo = !controls.toggleVideo.showVideo;
            if(controls.toggleVideo.showVideo){
                window.player.getIframe().style.display = 'block';
            }
            else {
                window.player.getIframe().style.display = 'none';
            }
        };

        var playButton = document.createElement('input');
        controls.playButton = {
            element: playButton,
            icons: {
                play: '►',
                pause: '▐ ▌'
            }
        };
        playButton.id = 'playButton';
        playButton.classList.add('control-left');
        playButton.type = 'button';
        playButton.value = controls.playButton.icons.play;
        playButton.onclick = function(){
              if(window.player.getPlayerState() === YT.PlayerState.PLAYING){
                  window.player.pauseVideo();
              }
              else {
                  window.player.playVideo();
              }
        };

        var likeButton = document.createElement('input');
        controls.likeButton = {
            element: likeButton,
            icons: {
                full: '★',
                empty: '✩'
            },
            full: false
        };
        likeButton.id = 'likeButton';
        likeButton.type = 'button';
        likeButton.classList.add('control-right');
        likeButton.value = controls.likeButton.icons.empty;
        likeButton.onclick = toggleLiked;

        var volumeBar = document.createElement('input');
        controls.volumeBar = {
            element: volumeBar
        };
        volumeBar.id = 'volumeBar';
        volumeBar.classList.add('control-left');
        volumeBar.type = 'range';
        volumeBar.min = 0;
        volumeBar.max = 100;
        volumeBar.value = 0;
        volumeBar.oninput = function (event) {
          window.player.setVolume(event.target.value);
        };

        var seekBar = document.createElement('input');
        controls.seekBar = {
            element: seekBar,
            pressed: false
        };
        seekBar.id = 'seekBar';
        seekBar.type = 'range';
        seekBar.min = 0;
        seekBar.value = 0;
        seekBar.onchange = function(event){
            window.player.seekTo(event.target.value);
        };
        seekBar.onmousedown = function(){
            controls.seekBar.pressed = true;
        };

        seekBar.onmouseup = function(){
            controls.seekBar.pressed = false;
        };

        var playbackMethod = document.createElement('select');
        playbackMethod.classList.add('control-right');
        playbackMethod.onchange = function(event){
            var method = event.target.querySelector('option:checked').value;
            getNextVideoId = playbackMethods[method];
        };

        var unwatched = createOption('Unwatched');
        unwatched.value = 'unwatched';
        playbackMethod.appendChild(unwatched);

        var inOrder = createOption('In order');
        inOrder.value = 'inOrder';
        playbackMethod.appendChild(inOrder);

        controlsDiv.appendChild(seekBar);
        controlsDiv.appendChild(playButton);
        controlsDiv.appendChild(volumeBar);
        controlsDiv.appendChild(likeButton);
        controlsDiv.appendChild(toggleVideo);
        controlsDiv.appendChild(playbackMethod);
        return controlsDiv;
    };

    var parseHTML = function(str){
        var soup = new DOMParser();
        return soup.parseFromString(str, 'text/html');
    };

    var sAjax = function(url, callback, _parse, _post, _data) {
        // TODO: Rewrite this function to accept a single object
        var parse = (typeof _parse === 'undefined') ? true : _parse;
        var post = (typeof _post === 'undefined') ? true : _post;

        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 &&
                (xhr.status === 200 || xhr.status === 204) &&
                callback) {
                if (parse) {
                    callback(JSON.parse(xhr.responseText));
                }
                else {
                    callback(xhr.responseText);
                }
            }
        };
        if (post) {
            xhr.open('POST', url, true);
            xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
            xhr.send(_data);
        }
        else {
            xhr.open('GET', url, true);
            xhr.send();
        }
    };

    var markWatched = function(video){
        if(!video.watched){
            var path = MARK_WATCHED_PATH + video.videoId;

            sAjax(path, function(){
                document.getElementById(nowPlaying).classList.add('watched');
                videoList[nowPlaying].watched = true;
            }, false);
        }
    };

    var toggleLiked = function() {
        if([YT.PlayerState.PLAYING, YT.PlayerState.PAUSED].indexOf(window.player.getPlayerState()) > -1){
            var token = yt.getConfig('XSRF_TOKEN');
            var likeButton = controls.likeButton;

            var post = 'screen=h%3D1080%26w%3D1920%26d%3D24&session_token=' + encodeURIComponent(token);

            if(likeButton.full){
                // Removing liked status
                sAjax('https://www.youtube.com/watch_actions_ajax?action_indifferent_video=1&video_id=' + nowPlaying,
                    function(data){
                        console.log(data);

                        likeButton.element.value = likeButton.icons.empty;
                        likeButton.full = false;
                    },
                    false, true, post);
            }
            else {
                // Adding liked status
                sAjax('https://www.youtube.com/watch_actions_ajax?action_like_video=1&video_id=' + nowPlaying,
                    function(data){
                        console.log(data);

                        likeButton.element.value = likeButton.icons.full;
                        likeButton.full = true;
                    },
                    false, true, post);
            }
        }
    };

    var parseAjaxPage = function(reply){
        var loadMoreWidgetHTML = parseHTML(reply.load_more_widget_html);
        var nextPageURL = loadMoreWidgetHTML.querySelector('.load-more-button').dataset.uixLoadMoreHref;

        var contentHTML = parseHTML(reply.content_html);
        var videoElements = contentHTML.querySelectorAll('.yt-lockup-video');
        for (var i = 0; i < videoElements.length; i++) {

            var element = videoElements[i];

            var videoId = element.dataset.contextItemId;
            var title = element.querySelector('.yt-uix-tile-link').textContent;
            var time = element.querySelector('.video-time').textContent;
            var watched = element.querySelector('.watched') !== null;

            videoList[videoId] = {
                title: title,
                time: time,
                watched: watched,
                videoId: videoId
            };
        }

        // Fill playlist
        var tbody = document.createElement('tbody');
        var _oldTbody = playlist.querySelector('tbody');
        if(_oldTbody === null){
            playlist.appendChild(tbody);
        }
        else {
            playlist.replaceChild(tbody, _oldTbody);
        }

        for(var id in videoList){
            tbody.appendChild(createPlaylistElement(videoList[id]));
        }

        // Add "Load More"
        var loadMoreRow = document.createElement('tr');
        tbody.appendChild(loadMoreRow);

        var loadMoreTd = document.createElement('td');
        loadMoreRow.appendChild(loadMoreTd);
        loadMoreTd.colSpan = '2';
        loadMoreTd.id = 'loadMore';
        loadMoreTd.innerHTML = 'Load More';
        loadMoreTd.onclick = function(){
            sAjax(nextPageURL, parseAjaxPage);
        };
    };

    // main
    (function(){
        // Drop DOM
        var html = document.createElement('html');

        var head = document.createElement('head');
        html.appendChild(head);
        body = document.createElement('body');
        html.appendChild(body);
        document.replaceChild(html, document.documentElement);

        // Clear every timer
        var lastTimerId = setTimeout(null, 0);
        for (var i = 0; i < lastTimerId; i++) {
            clearTimeout(i);
        }

        // Add custom CSS
        var style = document.createElement('style');
        head.appendChild(style);
        style.innerHTML = STYLESHEET;

        // Add player container
        var player = document.createElement('div');
        body.appendChild(player);
        player.id = 'player';
        player.classList.add('player-full');

        // Add player element
        var ytPlayer = document.createElement('div');
        player.appendChild(ytPlayer);
        ytPlayer.id = 'ytPlayer';

        // Add custom player controls
        player.appendChild(createPlayerControls());

        // Add playlist element
        playlist = document.createElement('table');
        body.appendChild(playlist);
        playlist.id = 'playlist';
        playlist.style.marginTop = player.clientHeight + 'px';

        // Start loading the first page
        sAjax('/feed_ajax?action_load_collection_feed=1&collection_id=' + getFeedURI() + '&paging=0',
            parseAjaxPage);

        // Start initializing youtube player
        var iframeScript = document.createElement('script');
        iframeScript.src = IFRAME_API_PATH;
        body.appendChild(iframeScript);

        window.onYouTubeIframeAPIReady = function(){
            window.player = new YT.Player('ytPlayer', {
                width: 480,
                height: 270,
                events: {
                    onStateChange: function(event){
                        var player = event.target;
                        var state = event.data;

                        if(state === YT.PlayerState.PLAYING && updaterId === null){
                            var _nowPlaying = player.getVideoData().video_id;
                            if(_nowPlaying !== nowPlaying){
                                if(nowPlaying !== undefined){
                                    document.getElementById(nowPlaying).classList.remove('now-playing');
                                }
                                nowPlaying = _nowPlaying;
                                document.getElementById(nowPlaying).classList.add('now-playing');
                                markWatched(videoList[nowPlaying]);
                            }

                            controls.seekBar.element.max = window.player.getDuration();
                            controls.playButton.element.value = controls.playButton.icons.pause;

                            updaterId = setInterval(function(){
                                if(!controls.seekBar.pressed){
                                    controls.seekBar.element.value = window.player.getCurrentTime();
                                }
                            }, 500);

                            setupLikeButton();
                        }
                        if(state === YT.PlayerState.PAUSED){
                            clearInterval(updaterId);
                            updaterId = null;
                            controls.playButton.element.value = controls.playButton.icons.play;
                        }
                        if(state === YT.PlayerState.UNSTARTED){
                            clearInterval(updaterId);
                            controls.seekBar.element.min = 0;
                            updaterId = null;
                            controls.playButton.element.value = controls.playButton.icons.play;
                        }
                        if(state === YT.PlayerState.ENDED){
                            var next = getNextVideoId();
                            if(next !== undefined) {
                                player.loadVideoById(next);
                            }
                            controls.playButton.element.value = controls.playButton.icons.play;
                        }
                    },
                    onReady: function(){
                        controls.volumeBar.element.value = window.player.getVolume();
                    }
                }
            });
        };
    }());

    return {
        getControls: function(){
            return controls;
        }
    };
}());