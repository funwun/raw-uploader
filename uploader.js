const waterfall = require('async/waterfall'),
    fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    mime = require('mime'),
    _ = require('lodash'),
    Transform = require('stream').Transform,
    Writable = require('stream').Writable,
    EventEmitter = require('events');

class BodyRule extends Transform {
    constructor(rules, options) {
        super(options);

        const self = this;

        self._rules = _.map(rules, (rule) => {
            return function (chunk, callback) {
                rule._body(chunk, (code) => {
                    callback(code || null, chunk);
                });
            };
        });
    }

    // get error code
    get code() {
        return this._code;
    }

    _transform(chunk, encoding, done) {
        const self = this;

        const rules = [function (callback) {
            callback(null, chunk);
        }].concat(self._rules);

        waterfall(rules, (code) => {
            if (code) {
                return self.emit('invalid', code);
            }

            self.push(chunk);
            done();
        });
    }
}

module.exports = class Uploader extends EventEmitter {
    constructor() {
        super();
    }

    set rules(rules) {
        this._rules = rules;
    }

    set outputs(outputs) {
        this._outputs = outputs;

    }

    get rules() {
        return this._rules;
    }

    get outputs() {
        return this._outputs;
    }

    process(options, req) {
        options = options || {};

        const self = this;
        const timeout = parseInt(options.timeout);
        var invalid = false;

        var writables = [];
        if (Array.isArray(self.outputs)) {
            for (const output of self.outputs) {
                var writable = new Writable(output);
                writable._write = (chunk, encoding, next) => {
                    output._process(chunk, next);
                };

                writable.on('finish', () => {
                    output._end((label, data) => {
                        self.emit('finish', label, data);
                    });
                }).on('error', (err) => {
                    output._cancel(err, () => {
                        self.emit('error', err);
                    });
                }).on('aborted', () => {
                    output._cancel(new Error('aborted'), () => {

                    });
                });
                writables.push(writable);
            }
        }

        // timeout
        if (timeout > 0) {
            const resetReqTimeout = function (reqTimeout) {
                if (reqTimeout) {
                    clearTimeout(reqTimeout);
                }
                return setTimeout(() => {
                    for (const writable of writables) {
                        writable.emit('aborted');
                    }
                    self.emit('timeout');
                }, timeout);
            };

            var reqTimeout = resetReqTimeout();
            req.on('data', () => {
                reqTimeout = resetReqTimeout(reqTimeout);
            });
        }

        req.once('aborted', () => { // request aborted
            clearTimeout(reqTimeout);

            // header or body "invalid" event is not emitted
            if (!invalid) {
                for (const writable of writables) {
                    writable.emit('aborted');
                }
                self.emit('aborted');
            }
        }).once('end', () => {
            clearTimeout(reqTimeout);
        }).once('error', () => {
            clearTimeout(reqTimeout);
        });

        var headerRules = [],
            bodyRule;

        if (Array.isArray(self._rules)) {
            var bodyRules = [];
            for (const rule of self._rules) {
                rule.req = req;
                if (rule._header) {
                    headerRules.push(function (callback) {
                        rule._header(callback);
                    });
                }
                if (rule._body) {
                    bodyRules.push(rule);
                }
            }

            if (bodyRules.length > 0) {
                bodyRule = new BodyRule(bodyRules);
                bodyRule.req = req;
                bodyRule.on('invalid', (code) => {
                    self.emit('invalid', code, 'body');
                });
            }
        }

        self.once('invalid', () => {
            invalid = true;
            for (const writable of writables) {
                writable.emit('aborted');
            }
        });

        // header rules
        waterfall(headerRules, (code) => {
            if (code) {
                return self.emit('invalid', code, 'header');
            }

            var pipeStream = req;

            // body rules
            if (bodyRule) {
                pipeStream = pipeStream.pipe(bodyRule);
            }

            // outputs
            for (const writable of writables) {
                pipeStream.pipe(writable);
            }
        });
    }
}