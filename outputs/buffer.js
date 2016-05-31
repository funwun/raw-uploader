module.exports = class BufferOutput {
    constructor(options) {
        this._options = options;
        this._chunks = [];
        this._label = options.label || 'buffer';
    }

    _process(chunk, next) {
        this._chunks.push(chunk);
        next();
    }

    _end(callback) {
        const buffer = Buffer.concat(this._chunks);
        callback(this._label, {
            buffer: buffer
        });
    }

    _error(err, callback) {
        if (callback) {
            callback();
        }
    }
}