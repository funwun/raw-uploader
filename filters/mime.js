const fileType = require('file-type');

module.exports = class MimeFilter {
    constructor(options) {
        this.options = options;
        this.mimeChunks = [];
        this._label = 'mime';
    }

    _header(callback) {
        const types = this.options.types;
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
        if (this.verified) {
            return callback(null);
        }

        this.length += chunk.length;
        this.mimeChunks.push(chunk);

        if (this.length < 262) {
            return callback(null);
        }

        this.verified = true;
        const mimeChunk = Buffer.concat(this.mimeChunks);
        const mimeType = fileType(mimeChunk);

        if (!mimeType || this.options.types.indexOf(mimeType.mime) < 0) {
            // received file extension error
            return callback(415);
        }
        
        callback(null);
    }
}