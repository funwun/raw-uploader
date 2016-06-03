const http = require('http'),
    fs = require('fs'),
    assert = require('chai').assert;

describe('test', function () {
    it('[200] request has succeeded.', function (done) {
        const options = {
            port: 4000,
            host: '127.0.0.1',
            method: 'POST',
            path: '/',
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Length': 36143,
                'Filename': 'a.jpg'
            }
        };

        const req = http.request(options, (res) => {
            assert.equal(res.statusCode, 200);
            res.chunks = [];
            res.on('data', (chunk) => {
                res.chunks.push(chunk);
            });
            res.on('end', () => {
                const ret = JSON.parse(Buffer.concat(res.chunks).toString());
                done();
            });
        });

        req.on('error', (err) => {
            // console.log(err);
        });

        var readStream = fs.createReadStream('./m.jpg');
        readStream.on('data', (data) => {
            req.write(data);
        });
    });

    it('[415] [header] content type is not valid.', function (done) {
        const options = {
            port: 4000,
            host: '127.0.0.1',
            method: 'POST',
            path: '/',
            headers: {
                'Content-Type': 'image/png',
                'Content-Length': 36143,
                'Filename': 'a.jpg'
            }
        };

        const req = http.request(options, (res) => {
            assert.equal(res.statusCode, 415);
            res.chunks = [];
            res.on('data', (chunk) => {
                res.chunks.push(chunk);
            });
            res.on('end', () => {
                const ret = JSON.parse(Buffer.concat(res.chunks).toString());
                assert.equal(ret.pos, 'header');
                done();
            });
        });

        req.on('error', (err) => {
            
        });

        var readStream = fs.createReadStream('./m.jpg');
        readStream.on('data', (data) => {
            req.write(data);
        });
    });
    
    it('[415] [body] content type is not valid.', function (done) {
        const options = {
            port: 4000,
            host: '127.0.0.1',
            method: 'POST',
            path: '/',
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Length': 36143,
                'Filename': 'a.jpg'
            }
        };

        const req = http.request(options, (res) => {
            assert.equal(res.statusCode, 415);
            res.chunks = [];
            res.on('data', (chunk) => {
                res.chunks.push(chunk);
            });
            res.on('end', () => {
                const ret = JSON.parse(Buffer.concat(res.chunks).toString());
                assert.equal(ret.pos, 'body');
                done();
            });
        });

        req.on('error', (err) => {
            // console.log(err);
        });

        var readStream = fs.createReadStream('./m.png');
        readStream.on('data', (data) => {
            req.write(data);
        });
    });
    
    it('[413] [header] content length is too long.', function (done) {
        const options = {
            port: 4000,
            host: '127.0.0.1',
            method: 'POST',
            path: '/',
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Length': 3614300,
                'Filename': 'a.jpg'
            }
        };

        const req = http.request(options, (res) => {
            assert.equal(res.statusCode, 413);
            res.chunks = [];
            res.on('data', (chunk) => {
                res.chunks.push(chunk);
            });
            res.on('end', () => {
                const ret = JSON.parse(Buffer.concat(res.chunks).toString());
                assert.equal(ret.pos, 'header');
                done();
            });
        });

        req.on('error', (err) => {
            // console.log(err);
        });

        var readStream = fs.createReadStream('./m.png');
        readStream.on('data', (data) => {
            req.write(data);
        });
    });
    
    it('[422] [header] content length is too small.', function (done) {
        const options = {
            port: 4000,
            host: '127.0.0.1',
            method: 'POST',
            path: '/',
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Length': 99,
                'File-Name': 'a.jpg'
            }
        };

        const req = http.request(options, (res) => {
            assert.equal(res.statusCode, 422);
            res.chunks = [];
            res.on('data', (chunk) => {
                res.chunks.push(chunk);
            });
            res.on('end', () => {
                const ret = JSON.parse(Buffer.concat(res.chunks).toString());
                assert.equal(ret.pos, 'header');
                done();
            });
        });

        req.on('error', (err) => {
            // console.log(err);
        });

        var readStream = fs.createReadStream('./m.png');
        readStream.on('data', (data) => {
            req.write(data);
        });
    });
    
    it('[408] request timeout.', function (done) {
        const options = {
            port: 4000,
            host: '127.0.0.1',
            method: 'POST',
            path: '/',
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Length': 100000,
                'File-Name': 'a.jpg'
            }
        };

        const req = http.request(options, (res) => {
            assert.equal(res.statusCode, 408);
            res.chunks = [];
            res.on('data', (chunk) => {
                res.chunks.push(chunk);
            });
            res.on('end', () => {
                done();
            });
        });

        req.on('error', (err) => {
            // console.log(err);
        });

        var readStream = fs.createReadStream('./m.jpg');
        readStream.on('data', (data) => {
            req.write(data);
        });
    });
});
