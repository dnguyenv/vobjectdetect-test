'use strict';

module.exports = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || '6379',
    db: parseInt(process.env.REDIS_DB) || 0,
    password: new Buffer((process.env.REDIS_PASSWORD || 'cEA1NXcwcmR+NHkwdTFuMHcj'), 'base64').toString('utf-8'),
    ttl: 6 * 3600, //6 HOURS
    disableTTL: false,
    prefix: process.env.REDIS_PREFIX || 'T-',
};