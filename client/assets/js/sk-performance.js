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
        var statsMaps = {};
        var avgRespMaps = {};
        $.statistics = function(info) {
            var code = info.code;
            var name = info.name;
            var uri = info.uri;
            var data = info.data;
            var message = info.message;
            var err = info.err;
            var created = info.created;
            var procTime = 0;
            var respTime = info.resp_time || 0;
            var started = info.started;
            var ended = info.ended;
            var takenTime = 0;
            var status = (err ? 'Error' : 'OK');
            var avgProcs = info.avg_trans || 0;
            var avgResp = info.avg_sers || 0;
            var dTrans = info.data_trans;
            var dSers = info.data_sers;
            var id = info._id;
            if (!uri || !id) {
                console.log('It is not a statistics server logs');
                return;
            }
            if (data && data.length > 0) {
                var det = data[data.length - 1];
                procTime = det['detection_time'];
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
            if (avgResp)
                avgRespMaps[name] = avgResp;
            // if (dTrans)
            // $.publish('/charts/line', [{
            //     'key': name + '-Transitions',
            //     'value': dTrans
            // }]);
            if (dSers)
                $.publish('/charts/line', [{
                    'key': name, // + 'Responses'
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

            if (status === 'FINISH' && procTime == 0) {
                procTime = avgProcs;
            }
            if (status === 'FINISH' && respTime == 0) {
                respTime = avgResp;
            }
            if (respTime >= 0 || avgResp >= 0) {
                px.append($('<p/>').html('Latency: <b>' + (respTime - procTime).toFixed(3) + '</b>s Avg: <b>' + (avgResp - avgProcs).toFixed(3) + '</b>s'));
            }

            if (procTime >= 0 || avgProcs >= 0) {
                px.append($('<p/>').html('Detection time: <b>' + procTime.toFixed(3) + '</b>s Avg: <b>' + avgProcs.toFixed(3) + '</b>s'));
            }
            if (message) {
                px.append($('<p/>').html('Message: ' + message));
            }
            //px.append($('<hr/>'));
            showAvgRespSpan();
        };

        function showDurationTime(l) {
            let s = l / 1000;
            let m = Math.floor(s / 60);
            let h = Math.floor(m / 60);
            s = Math.floor(s - m * 60);
            m = m - h * 60;
            return (h + ':' + m + ':' + s);
        };

        function showAvgRespSpan() {
            var pt = $('#avgSpan');
            pt.html('');
            var p = $('<ul/>');
            pt.append(p);
            var ks = Object.keys(avgRespMaps);
            var k1, v1, k2, v2, dis;
            for (var i = 0; i < ks.length; i++) {
                k1 = ks[i];
                v1 = avgRespMaps[k1];
                if (i < (ks.length - 1)) {
                    for (var j = i + 1; j < ks.length; j++) {
                        k2 = ks[j];
                        v2 = avgRespMaps[k2];
                        dis = (v1 - v2).toFixed(3);
                        if (dis > 0) {
                            p.append($('<li class="p-slower"/>').html('<b>' + k1 + '</b> is slower than <b>' + k2 + '</b> about <b>' + Math.abs(dis) + '</b>s'));
                        } else if (dis < 0) {
                            p.append($('<li class="p-faster"/>').html('<b>' + k1 + '</b> is faster than <b>' + k2 + '</b> about <b>' + dis + '</b>s'));
                        } else {
                            p.append($('<li class="p-equal"/>').html('<b>' + k1 + '</b> and <b>' + k2 + '</b> are equally'));
                        }
                    }
                }
            }

        }
    });
})(jQuery);