'use strict';

const debug = require('debug')('vobject:ws:manager');
const sio = require('socket.io');

const wsConf = require('./config');
const channelId = wsConf.perfId;
const eventPath = wsConf.perfCl;
const appConf = require('../config.local');

const wsConnection = require('./connection');

module.exports = function(app) {
    let rand = app.__generateUID(8);
    let serverName = 'WS-' + rand;

    let io = new sio({ 'transports': ['websocket'] });

    io.path('/sockets');
    io.attach(app.__httpServer);

    if (appConf.ws.enableMulClients) {
        const sioRedis = require('socket.io-redis');
        const cacher = require('redis-storage');

        let sub = cacher.createClient();
        let pub = cacher.createClient();

        io.adapter(sioRedis({ 'pubClient': pub, 'subClient': sub }));
    }

    let mapping = [{
        'id': 'api',
        'nsp': '/api/v1',
        'handler': wsConnection
    }];

    mapping.forEach(function(m) {
        var nsp = io.of(m.nsp);
        nsp.on('connection', function(socket) {
            debug('New client is connected to server: %s, socket ID: %s', serverName, socket.id);
            socket.serverName = serverName;
            new m.handler(app, socket);
        });
        app[m.id] = nsp;
    });

    // sharing session with express in general
    io.use(function(socket, next) {
        debug('In general section: socket authorization handshake');
        next();
    });

    app.api.use(function(socket, next) {
        debug('In private section: socket authorization handshake: req headers: %o', socket.request.headers);
        return next();
    });

    // broadcast to everyone in the room with given room id
    app.__send = function(message) {
        message = message || { 'message': 'GOOD' };
        message.created = new Date().getTime();
        // debug('app send %o', message);
        app.api.to(channelId).emit(eventPath, message);
    };
    // Attach socket to app
    app.io = io;
    //app.serverName = serverName;

    return io;
};