'use strict';

const Debug = require('debug');
const debug = Debug('vobject:main');
Debug.enable('vobject:*');

const path = require('path');
const http = require('http');
const randtoken = require('rand-token');
const createError = require('http-errors');
const express = require('express');
const conf = require('./config.local');

const Tester = require('./tester');

const testServers = conf.app.testServers;

const app = express();
const port = conf.app.port;

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

app.set('port', port);
app.use(express.static(path.join(__dirname, '../client')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.send({
        'error': {
            'statusCode': err.status || 500,
            'name': 'Error',
            'message': res.locals.message,
            'stack': res.locals.error
        }
    });
});
var server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

app.__httpServer = server;
app.__toUID = __toUID;
app.__generateUID = __generateUID;

require('./websocket/manager')(app);

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    debug('Listening on ' + bind);
    testServers.forEach(tser => {
        debug('Testing server %o', tser);
        let tester = Tester(app, { 'url': tser.url, 'name': tser.name });
        tester.run();
    });
}

function __toUID(uidString, seperater) {
    if (!uidString) return uidString;
    let suid = (uidString).split('');
    let breakPoint = 4;
    seperater = seperater || '-';
    let i = suid.length;
    while (i > breakPoint) {
        i -= breakPoint;
        suid.splice(i, 0, seperater);
    }
    return suid.join('');
};

function __generateUID(size, seperater) {
    let suid = randtoken.generate(size || 12);
    return __toUID(suid, seperater);
};