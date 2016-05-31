const async = require('async'),
    fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    mime = require('mime'),
    _ = require('lodash'),
    Transform = require('stream').Transform,
    Writable = require('stream').Writable,
    EventEmitter = require('events');

class BodyFilter extends Transform {
    constructor(filters, options) {
        super(options);

        const self = this;
        self._filters = filters;
        self._filtered = false;
    }

    // get if body is filtered
    get isFiltered() {
        return this._filtered;
    }

    // get error code
    get code() {
        return this._code;
    }

    _transform(chunk, encoding, done) {
        const self = this;

        var filters = [];

        for (const filter of self._filters) {
            filters.push(function (callback) {
                filter._body(chunk, (code) => {
                    callback(code || null);
                })
            });
        }

        async.waterfall(filters, (code) => {
            if (!code) {
                self.push(chunk);
                return done();
            }

            // filtered
            self._filtered = true;
            self._code = code;
            self.unpipe();
        });
    }
}

class OutputWritable extends Writable {
    constructor(output, options) {
        super(options);
        const self = this;
        self._output = output;

        self.on('unpipe', (source) => {
            if (!source.isFiltered) {
                return output._end((label, data) => {
                    self.emit('done', label, data);
                });
            }

            output._error(new Error('unpipe'), () => {
                self.emit('filtered', source.code, 'body');
            });
        });
        self.on('error', (err) => {
            output._error(err, () => {
                self.emit('_error', err);
            });
        });
    }

    _write(chunk, encoding, next) {
        this._output._process(chunk, next);
    }
}

module.exports = class Uploader extends EventEmitter {
    constructor(req) {
        super();
        this._req = req;
    }

    set req(req) {
        this._req = req;
    }

    set filters(filters) {
        const self = this;
        self._headerFilters = [];

        if (Array.isArray(filters)) {
            var bodyFilters = [];
            for (const filter of filters) {
                filter.req = self._req;
                self._headerFilters.push(function (callback) {
                    if (filter._header) {
                        filter._header(callback);
                    }
                });

                if (filter._body) {
                    bodyFilters.push(filter);
                }
            }

            if (bodyFilters.length > 0) {
                self._bodyFilter = new BodyFilter(bodyFilters);
            }
        }
    }

    set outputs(outputs) {
        this._outputs = [];
        if (outputs) {
            for (const output of outputs) {
                this._outputs.push(new OutputWritable(output));
            }
        }
    }

    upload() {
        const self = this;
        var filteredEmited = false;

        // header filters
        async.waterfall(self._headerFilters, (code) => {
            if (code) {
                // emit header filter error
                return self.emit('filtered', code, 'header');
            }

            var pipeStream = self._req;

            // body filters
            if (self._bodyFilter) {
                pipeStream = pipeStream.pipe(self._bodyFilter);
            }

            // outputs
            for (const output of self._outputs) {
                output.on('done', (label, data) => {
                    self.emit('done', label, data);
                });
                output.on('filtered', (code, pos) => {
                    if (!filteredEmited) {
                        self.emit('filtered', code, pos);
                    }
                    filteredEmited = true;
                });
                output.on('_error', (err) => {
                    self.emit('error', err);
                });
                pipeStream.pipe(output);
            }
        });
    }
}