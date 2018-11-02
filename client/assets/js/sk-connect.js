'use strict';


(function($) {

    $.timeFormatOpt = {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    };
    $.timeToString = function(t) {
        return t.toLocaleDateString('en-us', $.timeFormatOpt);
    };

    $.regJsonView = function(row, it) {
        var rowObj = $(row);
        rowObj.on('click', function() {
            var pretty = JSON.stringify(it, undefined, 4);
            window.open('blank.html?#' + btoa(encodeURIComponent(pretty)), '_blank');
        });
        return rowObj;
    };

    $.skParams = {
        host: ('//' + (location.host || location.hostname)) + '/api/v1',
        skOptions: {
            'transports': ['websocket'],
            'force new connection': false,
            'path': '/sockets',
            'reconnect': true,
            'query': { 'foo': 'my-foo', 'boo': 'my-boo' }
        }
    };

    $(document).ready(function() {
        $.subscribe('/cl/connected', function(data) {
            console.log('/cl/connected', data.id);
        });
        $.subscribe('/cl/connected/server', function(data) {
            console.log('/cl/connected/server', data);
            $('#sockerServer').html(data.name);
            $('#socketId').html(data.id);
        });
        $.skInstance = $.WebSocketManager($.skParams);
        $.skInstance.startup();
    });
})(jQuery);