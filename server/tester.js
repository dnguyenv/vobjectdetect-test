'use strict';

const debug = require('debug')('vobject:tester');
var crypto = require('crypto')
const request = require('request');
//require('request-debug')(request);

const fs = require('fs');
const path = require('path');
const mime = require('mime-types')
const Jimp = require('jimp');
const conf = require('./config.local');

module.exports = function(app, options) {
    let rand = app.__generateUID(8);
    let testerName = options.name || 'T-' + rand; 
    debug('Client', testerName, options.url)

    let IMAGE_FORMDATA = {
        threshold: '0.40',
        image: 'BLOB-DATA'
    }
    let POST_OPTIONS = {
        url: 'http://localhost:5000/image',
        method: 'POST',
        formData: undefined
    };

    let LIFE_TIME = conf.tester.lifeTime;
    let PROCESS_INTERVAL = conf.tester.processInterval;
    let IMAGE_SRC_DIR = conf.tester.imageSrcDir;
    let IMAGE_TEST_DIR = conf.tester.imageTestDir;
    let DELETE_TEST_FILE = conf.tester.enableDeleteTestFile;

    let IMAGE_MAX_WIDTH = conf.tester.imageMaxWidth;
    let IMAGE_MAX_HEIGHT = conf.tester.imageMaxHeight;

    let reqFiles = [];
    let timer = null;
    let timeStart = null;
    let timeEnd = null;
    let counter = 0;
    let font = null;
    let serverId = null;
    
    let avgTrans = [];
    let avgSers = [];

    options = options || {};
    if (options.url) {
        POST_OPTIONS.url = options.url;
    }
    if (options.lifeTime) {
        LIFE_TIME = options.lifeTime;
    }
    if (options.deleteTest == false) {
        DELETE_TEST_FILE = false;
    }

    var md5sum = crypto.createHash('md5');
    md5sum.update(POST_OPTIONS.url);
    serverId = md5sum.digest('hex');
    app.__testers = app.__testers||{};
    app.__testers[serverId] = {};
    //Kick it off
    //startup();
    return {
        'run': startup
    }

function _avg(arr) {
        if (arr.length) {
            let sum = arr.reduce(function(a, b) { return a + b; });
            return sum / arr.length;
        }
        return 0;
}
function _renderMsg(code, options) {
        let ret = Object.assign({ 'name': testerName, 'uri': POST_OPTIONS.url, 'code': code, '_id': serverId, 'avg_trans': _avg(avgTrans), 'avg_sers': _avg(avgSers), 'data_trans': avgTrans, 'data_sers': avgSers }, options);
        if (timeStart) {
            ret.started = timeStart.getTime();
        }
        if (timeEnd) {
            ret.ended = timeEnd.getTime();
        }
        app.__testers[serverId] = ret;
        return ret;
};
function listTestSrc(srcDir) {
    debug('srcDir %s', srcDir);
    fs.readdir(srcDir, function(err, files) {
        files.forEach(function(file) {
            let filepath = path.resolve(srcDir, file);
            debug('File %o', filepath);
            let type = mime.lookup(filepath);
            if (/image\//.test(type)) {
                debug('It is image file?, %s', file);
                fs.stat(filepath, function(err, stats) {
                    // Make sure it is a file
                    if (stats && stats.isFile()) {
                        debug('File YES %o', stats);
                        reqFiles.push(filepath);
                    }
                });
            } else {
                debug('Ignore unsupported file, %s', file);
            }
        });
    });
};
function getReqData() {
    return new Promise(function(resolve, reject) {
        if (reqFiles.length === 0) {
            reject('No data input');
            return;
        }
        let rand = Math.round(Math.random()*10000000000);
        let posi = rand%(reqFiles.length);
        let filepath = reqFiles[posi];

        let formData = Object.assign({}, IMAGE_FORMDATA);
        let data = Object.assign({}, POST_OPTIONS, { formData: formData });

        debug('getReqData at %d, rand %s, file: %s', posi, rand, filepath);
    
        let maxWidth = IMAGE_MAX_WIDTH;
        let maxHeight = IMAGE_MAX_HEIGHT;
        let x = rand%Math.round(maxWidth/4);
        let y = rand%Math.round(maxHeight/4);
        let text = 'T-'+app.__generateUID()+'-'+rand;
        let outpath = path.resolve(IMAGE_TEST_DIR, text+'.jpg');
        data.outpath = outpath;
        Jimp.read(filepath).then(function(image) {
            debug('Jimp read image');
            image.resize(maxWidth, maxHeight)
            .quality(90)
            .greyscale()
            .print(font, x, y, {
                text: text,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            }, maxWidth, maxHeight)
            // .getBuffer('image/jpeg', function(err, buff) {
//                 debug('Jimp getBuffer result, %o', err);
//                 data.formData.image = StreamReadable(buff);
//                 resolve(data);
//             })
            .write(outpath, function(err, x) {
                debug('Jimp write result, %o, %o', err, x);
                data.formData.image = fs.createReadStream(outpath);
                resolve(data);
            });
        }).catch(err => {
            debug('Manipulate Image issue, err %o', err);
            reject('Can not read image');
      });
    });
};

async function doPost(cb) {
    debug('doPost START');
    let opt = await getReqData();
    if (!opt) {
        debug('doPost: No input data!');
        return;
    }
    let outpath = opt.outpath;
    opt.outpath = undefined;
    let started = new Date().getTime();
    let r = _renderMsg('POST-DATA', {'data': opt});
    app.__send(r);
    request.post(opt, function(err, respose, body) {
        if (DELETE_TEST_FILE) {
            fs.unlink(outpath, function(err, stat) {
                debug('After post -> Delete test-file? %s, %s', (err?'ERR':'YES'), outpath);
            });
        }
        let respTime = (new Date().getTime() - started)/1000;
        avgSers.push(respTime);
        if (err) {
            r = _renderMsg('POST-RESULT-ERR', {'err': err, 'resp_time': respTime});
            app.__send(r);
            debug('doPost: Error ...%o', err);
            cb(err);
            return;
        }
        var data = body;
        try {
            data = JSON.parse(data);
        } catch(e){}
        let det = data[data.length-1];
        if (det && det['detection_time'] >= 0) {
            let dTime = parseFloat(det['detection_time']);
            avgTrans.push(dTime);
        }
        r = _renderMsg('POST-RESULT', {'data': data, 'resp_time': respTime});
        app.__send(r);
        debug('doPost: Result...%o', body);
        cb(err, body);
    });
};
function showDurationTime(l) {
    let s = l/1000;
    let m = Math.floor(s/60);
    let h = Math.floor(m/60);
    s = Math.floor(s - m*60);
    m = m - h*60;
    return (h + ':' + m + ':' + s);
};

function processManage() {
    debug('processManage START');
    timeEnd = new Date();
    doPost(function() {
        if (!timer) {
            let r = _renderMsg('FINISH', {'message': 'Performance test on this server is completed'});
            app.__send(r);
        }
    });
    counter++;
    let runningTime = timeEnd.getTime() - timeStart.getTime();
    debug('process number %d, duration %s, start %s', counter, showDurationTime(runningTime), timeStart);
    if (runningTime > LIFE_TIME && timer) {
        clearInterval(timer);
        timer = null;
        debug('STOP Interval process!');
        //process.exit(0);
    }
    debug('processManage FINISH');
}

function startup() {
    debug('startup');
    timeStart = new Date();
    listTestSrc(IMAGE_SRC_DIR);
    Jimp.loadFont(Jimp.FONT_SANS_16_BLACK).then(function(result) {
        debug('Loaded font');
        font = result;
    });
    let r = _renderMsg('BEGIN', {'message': 'Performance test on this server is started'});
    app.__send(r);

    timer = setInterval(processManage, PROCESS_INTERVAL);
}


};