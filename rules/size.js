module.exports = class SizeRule {
    constructor(options) {
        this.options = options;
        this.length = 0;
        this._label = 'size';
    }

    _header(callback) {
        const max = this.options.max;
        const min = this.options.min;
        var contentLength = this.req.headers['content-length'];
        if (contentLength === undefined) {
            // length required
            return callback(411);
        }
        contentLength = parseInt(contentLength) || 0;
        if (contentLength < min) {
            // request entity too small
            return callback(422);
        }

        if (max && contentLength > max) {
            // request entity too large
            return callback(413);
        }

        callback(null);
    }

    _body(chunk, callback) {
        this.length += chunk.length;
        // this.options.max = 36141; // for test
        if (this.length > this.options.max) {
            return callback(413);
        }
        
        callback(null);
    }
}