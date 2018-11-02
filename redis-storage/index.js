'use strict';

const debug = require('debug')('flockface:storage:redis:cacher');
const redis = require('redis');
const Q = require('q');

const config = require('./config');
const cryp = require('./cryp');

var _client = null;
var _option = null;

function _createClient(opt) {
    let opts = Object.assign({}, config, opt, {
        'return_buffers': true,
        'retry_strategy': 30000 /*time in milliseconds*/ ,
        'password': config.password,
        'auth_pass': config.password
    });

    opts.prefix = opts.prefix || 'xz-';
    opts.ttl = parseInt(opts.ttl) || 0;
    opts.disableTTL = (opts.disableTTL == true ? true : false);
    if (!_option) {
        _option = opts;
    }

    let cli = redis.createClient(opts);
    cli.opts = opts;

    cli.on('connect', function() {
        debug('On connect');
    });
    cli.on('reconnecting', function() {
        debug('On reconnecting');
    });
    cli.on('ready', function() {
        debug('On ready ');
    });
    cli.on('warning', function(d) {
        debug('On warning ', d);
    });
    cli.on('error', function(e) {
        debug('On error ', e);
    });
    cli.on('end', function() {
        debug('On end ');
    });

    return cli;
};

function _defaultClient(opt) {
    if (!_client) {
        opt = opt || _option;
        debug('Create new client %j', opt);
        _client = _createClient(opt);
    }
    return _client;
};

module.exports = {
    createClient: _createClient,
    createSubpub: function() {
        let sub = _createClient();
        let pub = _createClient();
        sub.on('subscribe', function(channel, count) {
            debug('on-subscribe: topic %j, number: %d', channel, count);
        });
        sub.on('message', function(channel, message) {
            debug('on-message: topic %j, message: %s', channel, message);
        });
        let $ = {};
        $.subscribe = function(channel) {
            sub.subscribe(channel);
        };
        $.unsubscribe = function(channel) {
            sub.unsubscribe(channel);
        };
        $.publish = function(channel, message) {
            pub.publish(channel, message);
        };
        $.quit = $.end = function() {
            sub.unsubscribe();
            sub.quit();
            pub.quit();
        };
        return $;
    },
    connect: function(opt) {
        return _defaultClient(opt);
    },
    set: function(key, value) {
        debug('set [key, value] = [%s, %j]', key, value);
        let def = Q.defer();
        let cli = _defaultClient();
        let ttl = cli.opts.ttl;
        let disableTTL = cli.opts.disableTTL;
        let prefix = cli.opts.prefix;
        let args = [prefix + key];

        try {
            value = JSON.stringify(value);
        } catch (e) {}

        args.push(value);

        if (ttl > 0 && !disableTTL) {
            args.push('EX', ttl);
        }

        cli.set(args, function(err) {
            def.resolve({ 'key': key, 'message': 'Saved', 'isSuccessful': true });
            debug('set [key] = [%s] successful', key);
        });

        return def.promise;
    },
    get: function(key) {
        debug('get [key] = [%s]', key);
        let def = Q.defer();
        let cli = _defaultClient();
        let prefix = cli.opts.prefix;

        cli.get(prefix + key, function(err, value) {
            if (value) {
                try {
                    value = JSON.parse(value.toString());
                } catch (e) {}
            }
            def.resolve(value);
            debug('get [value] = [%s]', JSON.stringify(value));
        });
        return def.promise;
    },
    remove: function(key) {
        debug('remove [key] = [%s]', key);
        let def = Q.defer();
        let cli = _defaultClient();
        let prefix = cli.opts.prefix;

        cli.del(prefix + key, function(err) {
            def.resolve({ 'key': key, 'message': 'Removed', 'isSuccessful': true });
            debug('remove [key] = [%s] successful', key);
        });
        return def.promise;
    },
    setHigh: function(key, value) {
        let k = cryp.hash(key);
        let v = cryp.encode(value);
        return this.save(k, v.toString());
    },
    getHigh: function(key) {
        let k = cryp.hash(key);
        return this.get(k).then(function(v) {
            if (v) {
                v = cryp.decode(v);
            }
            return v;
        });
    },
    removeHigh: function(key) {
        let k = cryp.hash(key);
        return this.remove(k);
    }
};