module.exports = class BufferOutput {
    constructor(options) {
        this._options = options;
        this._chunks = [];
        this._label = options.label || 'buffer';
    }

    _process(chunk, next) {
        const self = this;
        self._chunks.push(chunk);
        next();
    }

    _end(callback) {
        const self = this;
        const buffer = Buffer.concat(self._chunks);
        callback(self._label, {
            buffer: buffer
        });
    }

    _error(err, callback) {
        if (callback) {
            callback();
        }
    }
}