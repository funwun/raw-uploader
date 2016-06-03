const fileType = require('file-type');

module.exports = class MimeRule {
    constructor(options) {
        this._options = options;
        this._mimeChunks = [];
        this._label = 'mime';
    }

    _header(callback) {
        const types = this._options.types;
        if (!Array.isArray(types)) {
            return callback(null);
        }

        const contentType = this.req.headers['content-type'];
        if (!contentType || types.indexOf(contentType) < 0) {
            // request entity content type error
            return callback(415);
        }
        // var fileExtension = mime.extension(contentType);

        callback(null);
    }

    _body(chunk, callback) {
        const self = this;
        
        if (self.verified) {
            return callback(null);
        }

        self.length += chunk.length;
        self._mimeChunks.push(chunk);

        if (self.length < 262) {
            return callback(null);
        }

        self.verified = true;
        const mimeChunk = Buffer.concat(self._mimeChunks);
        const mimeType = fileType(mimeChunk);

        if (!mimeType || self._options.types.indexOf(mimeType.mime) < 0) {
            // received file extension error
            return callback(415);
        }
        
        callback(null);
    }
}