'use strict';

(function($) {
    $.skTopics = [{
        'sub': {
            'emit': '/sk/connected/server',
            'logmsg': 'Request name'
        },
        'pub': {
            'cmd': '/cl/connected/server',
            'logmsg': 'Retrieved name'
        }
    }, {
        'sub': {
            'emit': '/sk/servers/performance',
            'logmsg': 'Request info'
        },
        'pub': {
            'cmd': '/cl/servers/performance',
            'logmsg': 'Retrieved info'
        }
    }];
})(jQuery);