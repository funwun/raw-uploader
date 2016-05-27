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
var mime = require('mime');

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
        fileStream,
        fileExtension;

    // init params
    params.minFileSize = params.minFileSize || 1;

    
    // final callback 
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

        // destroy connection when upload failed
        if (code != 200) {
            if (params.disconnectOnErr) {
                res.sendStatus(code);
                req.destroy();
            }
        }

        cb(code, data);
    };

    // add error listener
    var errorListener = function (err) {
        // receive file failed or aborted
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
        // create dest folder
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
            if (!contentType || params.contentTypes.indexOf(contentType) < 0) {
                // request entity content type error
                return callback(415);
            }
            fileExtension = mime.extension(contentType);

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
                return callback(null, null);
            }

            // check mime type
            var checkMimeType = function () {
                req.once('data', function (data) {
                    buffers.push(data);
                    dataLength += data.length;

                    if (dataLength >= 262) {
                        var mimeData = Buffer.concat(buffers);
                        var mimeType = fileType(mimeData);
                        if (!mimeType || params.contentTypes.indexOf(mimeType.mime) < 0) {
                            // received file extension error
                            return callback(415);
                        }
                        
                        // get file extension from mime
                        if (mimeType && mimeType.ext) {
                            fileExtension = mimeType.ext;
                        }

                        return callback(null, mimeData);
                    }

                    checkMimeType();
                });
            };

            checkMimeType();
        },
        // receive data
        function (mimeData, callback) {
            var dataListener,
                buffers = [],
                dataLength;

            if (mimeData) {
                buffers.push(mimeData);
                dataLength = mimeData.length;
            }

            // check file size
            var checkSize = function () {
                if (dataLength > params.maxFileSize || dataLength > contentLength) {
                    // received file size too large
                    return callback(413);
                }
            };

            // requset end listener
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
                    dest = path.join(dest, fileName + (fileExtension ? '.' + fileExtension : ''));

                    if (!params.overwrite && fs.existsSync(dest)) {
                        // file exists
                        return callback(409);
                    }
                    else {
                        // pipe stream to file
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

            // add listeners
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
