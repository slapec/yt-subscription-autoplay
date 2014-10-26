/* global YT */
//@ sourceURL=yt-dev.js
(function(){
    'use strict';
    var IFRAME_API_PATH = 'https://www.youtube.com/iframe_api';
    var MARK_WATCHED_PATH = 'https://www.youtube.com/user_watch?video_id=';

    var STYLESHEET =
        'body {margin: 0}' +
        'table {border-collapse: collapse}' +
        'tr {cursor: pointer}' +
        'tr:hover {background: #BBEDFB}'+
        '.watched td:nth-child(2) {border-right: 6px solid #F6BDBC}' +
        '.now-playing {background: #A7EF91}' +
        '#player {position: fixed}' +
        '#playlist {float: right}';

    var videoList = {};
    var nowPlaying;

    var body;
    var playlist;

    var getFeedURI = function(){
      var parts = window.location.pathname.split('/');
      return parts[parts.length - 1];
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

    var parseHTML = function(str){
        var soup = new DOMParser();
        return soup.parseFromString(str, 'text/html');
    };

    var sAjax = function(url, callback, _parse){
        var parse = (typeof _parse === "undefined") ? true : _parse;

        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if(xhr.readyState === 4 &&
                (xhr.status === 200 || xhr.status === 204) &&
                callback){
                if(parse){
                    callback(JSON.parse(xhr.responseText));
                }
                else {
                    callback(xhr.responseText);
                }
            }
        };
        xhr.open('GET', url, true);
        xhr.send();
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

        // Mark nowPlaying
        if(nowPlaying !== undefined){
            document.getElementById(nowPlaying).classList.add('now-playing');
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

        var style = document.createElement('style');
        head.appendChild(style);
        style.innerHTML = STYLESHEET;

        // Add player element
        var player = document.createElement('div');
        body.appendChild(player);
        player.id = 'player';

        // Add playlist element
        playlist = document.createElement('table');
        body.appendChild(playlist);
        playlist.id = 'playlist';

        // Start loading the first page
        sAjax('/feed_ajax?action_load_collection_feed=1&collection_id=' + getFeedURI() + '&paging=0',
            parseAjaxPage);

        // Start initializing youtube player
        var iframeScript = document.createElement('script');
        iframeScript.src = IFRAME_API_PATH;
        body.appendChild(iframeScript);

        window.onYouTubeIframeAPIReady = function(){
            window.player = new YT.Player('player', {
                width: 480,
                height: 270,
                iv_load_policy: 3,
                events: {
                    onStateChange: function(event){
                        var player = event.target;
                        var state = event.data;

                        if(state === YT.PlayerState.PLAYING){
                            var _nowPlaying = player.getVideoData().video_id;
                            if(_nowPlaying !== nowPlaying){
                                if(nowPlaying !== undefined){
                                    document.getElementById(nowPlaying).classList.remove('now-playing');
                                }
                                nowPlaying = _nowPlaying;
                                document.getElementById(nowPlaying).classList.add('now-playing');
                                markWatched(videoList[nowPlaying]);
                            }
                        }
                        if(state === YT.PlayerState.ENDED){
                            var next;
                            var videoIds = Object.keys(videoList);

                            var videoIndex = 0;
                            for(videoIndex; videoList[videoIds[videoIndex]].watched; videoIndex++){}
                            next = videoIds[videoIndex];

                            if(next !== undefined) {
                                player.loadVideoById(next);
                            }
                        }
                    }
                }
            });
        };
    }());

    return {
        getVideoList: function(){
            return videoList;
        },
        getNowPlaying: function(){
            return videoList[nowPlaying];
        }
    };
}());