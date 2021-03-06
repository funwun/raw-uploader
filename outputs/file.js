const fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp');

const guid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = class FileOutput {
    constructor(options) {
        this._options = options || {};
        this._label = this._options.label || 'file';

        // TODO: add default options
        this._destFolder = this._options.destFolder || './';
        this._fileName = this._options.fileName;
        this._tmpDest = path.resolve(path.join(this._destFolder, guid() + '.tmp'));
        this._length = 0;
        this._firstChunk = true;
    }

    _process(chunk, next) {
        const self = this;
        var finished = false;

        const writeChunk = function (chunk) {
            if (!finished) {
                self._length += chunk.length;
                self._fileStream.write(chunk);
                next();
            }
        };

        if (self._firstChunk) {
            self._firstChunk = false;
            var fileStream = fs.createWriteStream(self._tmpDest, { 'flags': 'w' });

            fileStream.on('error', (err) => {
                self._cancel(err);
            }).on('finish', () => {
                finished = true;
            }).on('open', () => {
                mkdirp(self._options.destFolder, function (err) {
                    if (err) {
                        return self._cancel(err);
                    }

                    writeChunk(chunk);
                });
            });

            self._fileStream = fileStream;
            return;
        }

        writeChunk(chunk);
    }

    _end(callback) {
        const self = this;
        const dest = path.resolve(path.join(self._destFolder, self._fileName));
        if (self._fileStream) {
            self._fileStream.end(() => {
                fs.rename(self._tmpDest, dest);
            });
        }

        callback(self._label, {
            fileSize: self._length,
            filePath: dest
        });
    }

    _cancel(err, callback) {
        const self = this;
        if (self._fileStream) {
            self._fileStream.end(() => {
                fs.unlink(self._tmpDest, () => {
                    if (callback) {
                        callback();
                    }
                });
            });
        }
    }
}