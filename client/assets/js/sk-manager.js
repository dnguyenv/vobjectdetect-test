'use strict';

(function($) {
    $.WebSocketManager = function(skParams) {
        var _socket = null;
        var _skGlobalO = {};
        var _skListeners = ['connect', 'disconnect', 'reconnecting', 'error', 'connecting', 'connect_failed', 'reconnect_failed', 'reconnect'];
        var _skDefaultParams = {
            host: '//localhost:3000',
            skOptions: {
                'transports': ['websocket'],
                'force new connection': false
            },
            cmdOptions: {}
        };

        var _startup = function() {
            console.log('Web _socket handler startup Start');
            if (!skParams) {
                console.log('Use default configuration for socket');
                skParams = _skDefaultParams;
            }
            var host = skParams.host;
            var skOptions = skParams.skOptions;

            // clean up every thing if any
            _skForceStop();

            if (_socket) {
                console.log('Reconnect with existing WebSocket Manager');
                if (skOptions) {
                    _socket.io.connect(host, skOptions);
                } else {
                    _socket.io.connect(host);
                }
            } else {
                console.log('Create a new WebSocket');
                _socket = (skOptions ? io(host, skOptions) : io(host));
            }

            console.log('Start to register some _socket basic events');
            _socket.on('connect', $.proxy(_onSocketConnect, _skGlobalO, _socket));
            _socket.on('disconnect', $.proxy(_onSocketDisconnected, _skGlobalO, _socket));
            _socket.on('reconnecting', $.proxy(_onSocketReconnecting, _skGlobalO, _socket));

            _socket.on('error', function(reason) {
                console.warn('Unable to connect Socket.IO' + reason);
            });
            _socket.on('connecting', function() {
                console.log('Socket is connecting');
            });
            _socket.on('connect_failed', function() {
                console.warn('Socket fails to connect');
                $.publish('/cl/alert', [{ message: 'Could not establish the socket connection due to network issue' }]);
            });
            _socket.on('reconnect_failed', function() {
                console.warn('Socket fails to re-connect');
            });
            _socket.on('reconnect', function() {
                console.warn('Socket trys to reconnect');
            });
            console.log('Web _socket handler startup End');
        };

        var _initConnect = function(_socket) {
            var options = skParams.cmdOptions;
            for (var i in options) {
                _socket.emit(i, options[i]);
            }
        };

        var _onSocketConnect = function(_socket) {
            console.log('Socket is connected');
            SocketListener(_socket);
            SocketSender(_socket);

            console.log('Execute some init actions on start');
            _initConnect(_socket);

            console.log('Fire on _socket connected');
            $.publish('/cl/connected', [_socket]);
        };

        var _onSocketDisconnected = function(_socket) {
            console.log('Socket is disconnected');
            $.publish('/cl/disconnected', []);
        };

        var _onSocketReconnecting = function(_socket, d) {
            console.log('Socket is reconnecting', JSON.stringify(d));
            console.log('Fire on _socket reconnecting');
            $.publish('/cl/reconnecting', [d]);
        };

        var _cleanupSocketEvents = function() {
            if (!_socket) {
                return;
            }
            for (var i = 0; i < _skListeners.length; i++) {
                try {
                    _socket.removeAllListeners(_skListeners[i]);
                } catch (e) {}
            }
        };

        var _skForceStop = function() {
            console.log('skForceStop');
            if (!_socket) {
                return;
            }
            _cleanupAllSubscribes();
            _cleanupAllListeners();
            _cleanupSocketEvents();

            _socket.io.disconnect();
        };

        var _skForceReconnect = function() {
            console.log('skForceReconnect');
            if (!_socket) {
                return;
            }
            console.log('force to reconnect for anytime to start new connection');
            _socket.io.reconnect();
        };


        var _cleanupAllListeners = function() {
            if (!_socket) {
                return;
            }
            var l = $.skTopics;
            var o = null;
            for (var i = 0; i < l.length; i++) {
                o = l[i].pub;
                if (o && o.cmd) {
                    // remove all previous listeners for the topic
                    try {
                        _socket.removeAllListeners(o.cmd);
                    } catch (e) {
                        console.warn('Error while removing previous listener of _socket: ' + e);
                    }
                }
            }
        };

        var _cleanupAllSubscribes = function() {
            var l = $.skTopics;
            var o = null;
            for (var i = 0; i < l.length; i++) {
                o = l[i].sub;
                if (o && o.emit) {
                    $.unsubscribe(o.emit);
                }
            }
        };

        var SocketSender = function(_socket) {
            console.log('Start subscribing of listeners of client sub/pub topics');

            var _skEmit = function(_socket, p, d) {
                var eTopic = p['emit'];
                var logmsg = p['logmsg'] || null;
                var data = d ? d : {}

                if (logmsg) {
                    console.log(logmsg);
                }

                if (eTopic != '') {
                    if (!(_socket.connected)) { // || _socket.connecting
                        console.log('Socket could not reach the server at this time.');
                        $.publish('/cl/alert', [{ message: 'Please check your device\'s network connection' }]);

                        _socket.io.reconnect();
                    }

                    if (eTopic === 'authen') {
                        _socket.emit(eTopic, data);
                        return;
                    }

                    if (eTopic === 'logout') {
                        _socket.emit(eTopic, data);
                        return;
                    }

                    _socket.emit(eTopic, data, function skcallback(info) {
                        console.log('skcallback', JSON.stringify(info));
                        if (info && info.ack) return;
                        for (var i = 0; i < $.skTopics.length; i++) {
                            var o = $.skTopics[i];
                            if (o.sub && o.sub.emit == eTopic) {
                                if (o.pub && o.pub.cmd) {
                                    if (o.pub.logmsg) {
                                        console.log('pub log:', o.pub.logmsg);
                                    }
                                    $.publish(o.pub.cmd, [info]);
                                }
                                return;
                            }
                        }
                    });
                }
            };

            var _subscribe = function(_socket, sub) {
                var topic = sub.emit;
                $.unsubscribe(topic);
                /*_skSubMap[topic] = */
                $.subscribe(topic, $.proxy(_skEmit, _skGlobalO, _socket, sub));
            };

            // doing subscribe for all items
            console.log('subscribing ...');
            _cleanupAllSubscribes();

            var l = $.skTopics;
            var o = null;
            for (var i = 0; i < l.length; i++) {
                o = l[i].sub;
                if (o && o.emit) {
                    _subscribe(_socket, o);
                }
            }
        };

        var SocketListener = function(_socket) {
            console.log('Start subscribing the listeners of websocket');

            var _skReceived = function(_socket, p, data) {
                console.log('_skReceived: Fire from Server side. Init params: ', JSON.stringify(p));

                var logmsg = p.logmsg;
                var cmd = p.cmd || undefined;
                var errTopic = p.errTopic || undefined;
                var eTopic = p.emit || undefined;

                if (logmsg) {
                    console.log(logmsg, JSON.stringify(data));
                }

                if (cmd) {
                    console.log('publishing to topic', cmd);
                    $.publish(cmd, [data]);
                }

                if (data && data.err && errTopic) {
                    console.log('publishing to error topic', errTopic);
                }

                if (data && eTopic) {
                    console.log('emit', eTopic);
                    _socket.emit(eTopic, data, function skcallback(info) {
                        console.log('skcallback2', JSON.stringify(info));
                        if (info && info.ack) return;
                        for (var i = 0; i < $.skTopics.length; i++) {
                            var o = $.skTopics[i];
                            if (o.sub && o.sub.emit == eTopic) {
                                if (o.pub && o.pub.cmd) {
                                    if (o.pub.logmsg) {
                                        console.log(o.pub.logmsg);
                                    }
                                    $.publish(o.pub.cmd, [info]);
                                }
                                return;
                            }
                        }
                    });
                }
            };

            var _skOn = function(_socket, pub) {
                var cmd = pub.cmd;

                // register the new listener (addListener)
                _socket.on(cmd, $.proxy(_skReceived, _skGlobalO, _socket, pub));
            };

            console.log('Listening messages...');
            _cleanupAllListeners();

            var l = $.skTopics;
            var o = null;
            for (var i = 0; i < l.length; i++) {
                o = l[i].pub;
                if (o && o.cmd) {
                    _skOn(_socket, o);
                }
            }
        };

        // Register common functions to use later
        $.skForceStop = _skForceStop;
        $.skForceReconnect = _skForceReconnect;
        return {
            socket: _socket,
            startup: _startup,
            skForceStop: _skForceStop,
            skForceReconnect: _skForceReconnect
        };
    };
})(jQuery);