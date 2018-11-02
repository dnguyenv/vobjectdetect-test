'use strict';

const path = require('path');
let servers = require('./../servers.js');
module.exports = {
    app: {
        port: parseInt(process.env.PORT || '3000'),
        testServers: (function() {
            let l = process.env.TEST_SERVERS; // [{"name":"LOCAL-4000", "url": "http://localhost:4000/image"}, {"name": "LOCAL-5000", "url": "http://localhost:5000/image"}]
            if (l) {
                try {
                    return JSON.parse(l);
                } catch (e) {}
            }
            return [{
                    name: 'IBM Cloud',
                    url: 'https://mec-poc.us-south.containers.appdomain.cloud/image'
                },
                {
                    name: 'ICP Power',
                    url: 'https://192.168.103.37/vrtc-power/image'
                },
                {
                    name: 'ICP Intel',
                    url: 'https://192.168.103.37/vrtc-intel/image'
                }
            ];
        })()
    },
    tester: {
        lifeTime: process.env.LIFE_TIME || 1000 * 60 * 30, //30 minutes
        processInterval: process.env.INTERVAL || 2000,
        imageSrcDir: process.env.IMG_SRC_DIR || path.resolve(__dirname, '../img-src'),
        imageTestDir: process.env.IMG_TEST_DIR || path.resolve(__dirname, '../img-test'),
        enableDeleteTestFile: true,
        imageMaxWidth: 256,
        imageMaxHeight: 256
    },
    ws: {
        enableMulClients: process.env.ENABLE_MULTIPLE_CLIENTS || false
    }
};