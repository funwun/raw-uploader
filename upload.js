// params
// contentTypes      Array
// minFileSize       int
// maxFileSize       int
// outputType        string
// overwrite         bool
// destFolder        string
// destFileName      string
// disconnectOnErr   bool
// createDestFolder  bool
// deepCheckMime     bool
var async = require('async');
var fileType = require('file-type');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var guid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = function (params, req, res, cb) {
    var listeners = [],
        dest = params.destFolder || './',
        contentLength = 0,
        timeout,
        fileStream;

    var finalCallback = function (code, data) {
        if (fileStream) {
            fileStream.end();
        }
        if (timeout) {
            clearTimeout(timeout);
        }
        for (var i = 0; i < listeners.length; i++) {
            var listener = listeners[i];
            var event = Object.keys(listener)[0];
            var func = listener[event];
            req.removeListener(event, func);
        }
        if (code != 200 && code != 409 && fs.lstatSync(dest).isFile()) {
            fs.unlink(dest);
        }

        if (code != 200) {
            if (params.disconnectOnErr) {
                res.sendStatus(code);
                req.destroy();
            }
        }

        cb(code, data);
    };

    var errorListener = function (err) {
        // receive file error
        finalCallback(500);
    };
    req.on('error', errorListener)
        .on('aborted', errorListener);

    listeners.push({
        error: errorListener
    });
    listeners.push({
        aborted: errorListener
    });

    async.waterfall([
        function (callback) {
            if (params.createDestFolder) {
                return mkdirp(dest, function (err) {
                    if (err) {
                        callback(403);
                        return;
                    }

                    callback(null);
                });
            }

            callback(null);
        },
        // check content type
        function (callback) {
            if (!Array.isArray(params.contentTypes)) {
                return callback(null);
            }

            var contentType = req.headers['content-type'];
            if (params.contentTypes.indexOf(contentType) < 0) {
                // request entity content type error
                return callback(415);
            }

            callback(null);
        },
        // check content length
        function (callback) {
            contentLength = req.headers['content-length'];
            if (contentLength === undefined) {
                // length required
                return callback(411);
            }
            contentLength = parseInt(contentLength) || 0;
            if (params.minFileSize && contentLength < params.minFileSize) {
                // request entity too small
                return callback(422);
            }

            if (params.maxFileSize && contentLength > params.maxFileSize) {
                // request entity too large
                return callback(413);
            }

            callback(null);
        },
        // deep check mime type
        function (callback) {
            var dataLength = 0,
                buffers = [];

            if (!params.deepCheckMime) {
                return callback(null, null, null);
            }

            var checkMimeType = function () {
                req.once('data', function (data) {
                    buffers.push(data);
                    dataLength += data.length;

                    if (dataLength >= 262) {
                        var buffer = Buffer.concat(buffers);
                        var mimeType = fileType(buffer);
                        if (!mimeType || params.contentTypes.indexOf(mimeType.mime) < 0) {
                            // received file extension error
                            return callback(415);
                        }

                        return callback(null, buffer, mimeType);
                    }

                    checkMimeType();
                });
            };

            checkMimeType();
        },
        // receive data
        function (mimeData, mimeType, callback) {
            var dataListener,
                buffers = [],
                dataLength;

            if (mimeData) {
                buffers.push(mimeData);
                dataLength = mimeData.length;
            }

            var checkSize = function () {
                if (dataLength > params.maxFileSize || dataLength > contentLength) {
                    // received file size too large
                    return callback(413);
                }
            };

            var endListener = function () {
                if (res.statusCode != 200) {
                    return callback(res.statusCode);
                }

                if (dataLength < params.minFileSize) {
                    // received file size too small
                    return callback(422);
                }

                switch (params.outputType) {
                    default:
                    case 'buffer':
                        callback(200, Buffer.concat(buffers));
                        break;
                    case 'file':
                        callback(200, path.resolve(dest));
                        break;
                }
            };

            switch (params.outputType) {
                default:
                case 'buffer':
                    dataListener = function (data) {
                        dataLength += data.length;
                        buffers.push(data);
                        checkSize();
                    };
                    break;
                case 'file':
                    var fileName = params.destFileName || req.headers[params.fileNameHeader] || guid();
                    dest = path.join(dest, fileName + (mimeType ? '.' + mimeType.ext : ''));

                    if (!params.overwrite && fs.existsSync(dest)) {
                        return callback(409);
                    }
                    else {
                        fileStream = fs.createWriteStream(dest, { 'flags': 'w' });
                        if (mimeData) {
                            fileStream.write(mimeData);
                        }
                        req.pipe(fileStream);
                        dataListener = function (data) {
                            dataLength += data.length;
                            checkSize();
                        };
                    }
                    break;
            }

            if (dataListener) {
                req.on('data', dataListener);
                listeners.push({
                    data: dataListener
                });
            }

            if (endListener) {
                req.once('end', endListener);
                listeners.push({
                    end: endListener
                });
            }
        }
    ], function (code, data) {
        finalCallback(code, data);
    });
};
