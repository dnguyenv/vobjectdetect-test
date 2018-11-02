'use strict';

module.exports = {
    perfId: 'servers-performance-channel',
    perfCl: '/cl/servers/performance',
    topics: {
        test: {
            'status': {
                sk: '/sk/perf/status',
                cl: '/cl/perf/status'
            }
        },
        info: {
            'status': {
                sk: '/sk/perf/info',
                cl: '/cl/perf/info'
            }
        }
    }
};