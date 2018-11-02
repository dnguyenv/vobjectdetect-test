'use strict';


(function($, g) {
    $(document).ready(function() {
        var chartOpts = {
            title: 'Object Detection App Performance - Test Result',
            //curveType: 'function',
            legend: { position: 'right' },
            hAxis: { title: 'Post-Times' },
            vAxis: { title: 'Response-Time (milliseconds)' },
            width: '50%',
            height: 400
        };
        var timer = null;
        var delay = 12000;
        var lastPerform = new Date().getTime();
        var hasInput = false;
        var lastLen = 0;
        var rowLen = 0;
        var mapLines = {
            //name : [points]
        };
        var lastDataTables = null;
        $.subscribe('/charts/line', function(info) {
            //console.log('chart-line', info);
            hasInput = true;
            addMapLines(info);
            drawChartWithDelay();
        });

        function drawChartWithDelay() {
            //console.log('drawChartWithDelay set last per:', lastPerform);
            if (lastPerform - delay > 0) {
                lastPerform = new Date().getTime();
                hasInput = false;
                doingDraw();
                return;
            }
            if (hasInput) {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(drawChartWithDelay, delay);
            }
        };

        function doingDraw() {
            var len = JSON.stringify(mapLines).length;
            if (len != lastLen) {
                lastLen = len;
                var dt = dataTables();
                if (dt) {
                    lastDataTables = dt;
                }
                drawChart();
            }
        }

        function addMapLines(info) {
            mapLines[info.key] = info.value;
            if (info.value.length > rowLen) {
                rowLen = info.value.length;
            }
        };

        function dataTables() {
            var keys = Object.keys(mapLines);
            var n = keys.length;
            if (n === 0) {
                return null;
            }
            var rows = [
                ['Post-Times']
            ];
            var hRows = rows[0];
            hRows.push.apply(hRows, keys);
            var row = null;
            var index = 0;
            for (var k = 0; k < n; k++) {
                var key = keys[k];
                var v = mapLines[key];
                for (var i = 0; i < rowLen; i++) {
                    row = rows[i + 1];
                    if (!row) {
                        row = [i + 1];
                        rows.push(row);
                    }
                    if (v && v[i]) {
                        row.push(v[i] * 1000);
                    } else {
                        row.push(0);
                    }

                }
            }
            return rows;
        };
        // Load google charts
        g.charts.load('current', { 'packages': ['corechart', 'line'] });
        //g.charts.setOnLoadCallback(drawChart);

        // Draw the chart and set the chart values
        function drawChart() {
            if (!lastDataTables) {
                console.log('Have no data-table for drawing-chart');
                return;
            }
            if (!g.visualization || !g.visualization.LineChart) {
                setTimeout(drawChart, 1000);
                return;
            }
            var data = g.visualization.arrayToDataTable(lastDataTables);
            var chart = new g.visualization.LineChart(document.getElementById('mychart'));
            chart.draw(data, g.charts.Line.convertOptions(chartOpts));
        };
    });
})(jQuery, google);