var express = require('express');
var app = express();
var Uploader = require('./uploader');
var SizeRule = require('./rules/size');
var MimeRule = require('./rules/mime');
var BufferOutput = require('./outputs/buffer');
var FileOutput = require('./outputs/file');
var http = require('http');

app.post('/', function (req, res) {
    console.log('\n>> new request');
    const uploader = new Uploader();
    uploader.rules = [
        new SizeRule({
            min: 100,
            max: 361430
        }),
        new MimeRule({
            types: [
                'image/jpeg'
            ]
        })
    ];

    uploader.outputs = [
        new FileOutput({
            destFolder: './abc',
            fileName: 'abcd.jpg',
            overwrite: true,

        }),
        new BufferOutput()
    ];

    uploader.on('error', (err) => {
        console.log('error:', err);
    }).on('timeout', () => {
        console.log('timeout');
        res.statusCode = 408;
        res.end();
    }).on('aborted', () => {
        console.log('aborted');
    }).on('invalid', (code, pos) => {
        res.statusCode = code;
        res.write(JSON.stringify({
            'invalid': code,
            'pos': pos
        }));
        console.log('invalid', JSON.stringify({ code: code, position: pos }));
        res.destroy();
    }).on('finish', (label, data) => {
        console.log(label, data);
        if (label == 'file') {
            res.statusCode = 200;
            res.write(JSON.stringify(data));
            res.end();
        }
    });

    uploader.process({
        timeout: 1000
    }, req);
});

http.createServer(app).listen(4000);


// for test
// curl -v -X POST http://127.0.0.1:4000 -H "Content-Type:image/jpeg" --data-binary @test.jpg
// curl -v -X POST http://127.0.0.1:4000 -H "Content-Type:image/jpeg" -H "Content-Length:1000" --data-binary @test.jpg