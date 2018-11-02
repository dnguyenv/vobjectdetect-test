'use strict';

const debug = require('debug')('vobject:ws:connection');

const conf = require('./config');
const channelId = conf.perfId;
const eventPath = conf.perfCl;

module.exports = function(app, socket) {
    debug('handler of connected client, socket ID: %s', socket.id);
    var q = socket.request._query;
    debug('socket.request query: %o', q);
    socket.emit('/cl/connected/server', { 'name': socket.serverName, 'id': socket.id });

    socket.join(channelId);

    app.__send({ 'code': 'CONNECTED', 'name': app.serverName, 'message': 'Connected to channel: ' + channelId });
    if (app.__testers) {
        for (var i in app.__testers) {
            var ret = app.__testers[i];
            app.__send(ret);
        }
    }

    socket.on('disconnect', function() {
        debug('disconnected from server: %s, socket ID: %s', socket.serverName, socket.id);
        socket.leave(channelId);
        if (socket.request.session) {
            socket.request.session.destroy();
        }
    });

};