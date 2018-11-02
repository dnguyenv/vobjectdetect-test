'use strict';
(function($) {

    $(document).ready(function() {
        $.subscribe('/cl/servers/performance', function(data) {
            console.log('/cl/servers/performance', JSON.stringify(data));
            var v = $.regJsonView('<div class="cl-result"><label>/cl/servers/performance</label> <span>' + JSON.stringify(data) + '</span></div>', data);
            $.statistics(data);
            //$('div.cl-result').remove();
            var n = 3;
            var ls = $('div.cl-result');
            $('#results').prepend(v);
            if (ls.length > n) {
                for (var i = ls.length - 1; i > n; i--) {
                    ls[i].remove();
                }
            }
        });
        var statsMaps = {

        };
        $.statistics = function(info) {
            var code = info.code;
            var name = info.name;
            var uri = info.uri;
            var data = info.data;
            var message = info.message;
            var err = info.err;
            var created = info.created;
            var transmitt = 0;
            var sertime = info.resp_time || 0;
            var started = info.started;
            var ended = info.ended;
            var takenTime = 0;
            var status = (err ? 'Error' : 'OK');
            var avgTrans = info.avg_trans || 0;
            var avgSers = info.avg_sers || 0;
            var dTrans = info.data_trans;
            var dSers = info.data_sers;
            var id = info._id;
            if (!uri || !id) {
                console.log('It is not a statistics server logs');
                return;
            }
            if (data && data.length > 0) {
                var det = data[data.length - 1];
                transmitt = det['detection_time'];
            }
            var o = statsMaps[name] || data || {};
            if (code === 'BEGIN') {
                o = statsMaps[name] = data;
                status = 'BEGIN';
            } else if (code === 'FINISH') {
                status = 'FINISH';
            } else if (code === 'POST-RESULT') {} else if (code === 'POST-RESULT-ERR') {} else if (code === 'POST-DATA') {
                console.log('Don\'t need to show the post');
                return;
            } else if (code === 'CONNECTED') {
                console.log('It is not a tester part');
                return;
            }
            if (dTrans)
                $.publish('/charts/line', [{
                    'key': name + '-Transmission',
                    'value': dTrans
                }]);
            if (dSers)
                $.publish('/charts/line', [{
                    'key': name + '-Server Responses',
                    'value': dSers
                }]);
            if (started) {
                o.started = started;
            }
            if (ended) {
                o.ended = ended;
            }

            if (started && ended) {
                takenTime = (ended - started);
            } else if (started) {
                takenTime = (created - started)
            }

            var px = $('#' + id);

            if (!px.length) {
                px = $('<div class="stats-block" />');
                px.attr('id', id);
                $('#statistics').append(px);
            }
            px.html('');
            px.append($('<h4/>').html(name));
            px.append($('<p/>').html('Server URL: ' + uri));
            px.append($('<p/>').html('Status: ' + status));
            px.append($('<p/>').html('Started at: ' + $.timeToString(new Date(started || o.created)) + ', Taken: ' + showDurationTime(takenTime)));

            if (transmitt >= 0 || avgTrans >= 0) {
                if (status === 'FINISH' && transmitt == 0) {
                    transmitt = avgTrans;
                }
                px.append($('<p/>').html('Transmission time: <b>' + transmitt.toFixed(3) + '</b>s Avg: <b>' + avgTrans.toFixed(3) + '</b>s'));
            }
            if (sertime >= 0 || avgSers >= 0) {
                if (status === 'FINISH' && sertime == 0) {
                    sertime = avgSers;
                }
                px.append($('<p/>').html('Server processing time: <b>' + sertime.toFixed(3) + '</b>s Avg: <b>' + avgSers.toFixed(3) + '</b>s'));
            }
            if (message) {
                px.append($('<p/>').html('Message: ' + message));
            }
            //px.append($('<hr/>'));
        };

        function showDurationTime(l) {
            let s = l / 1000;
            let m = Math.floor(s / 60);
            let h = Math.floor(m / 60);
            s = Math.floor(s - m * 60);
            m = m - h * 60;
            return (h + ':' + m + ':' + s);
        };

    });
})(jQuery);