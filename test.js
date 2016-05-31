var express = require('express');
var app = express();
var Uploader = require('./uploader');
var SizeFilter = require('./filters/size');
var MimeFilter = require('./filters/mime');
var BufferOutput = require('./outputs/buffer');
var FileOutput = require('./outputs/file');
var http = require('http');

app.post('/', function (req, res) {
    const uploader = new Uploader(req);
    uploader.filters = [
        new SizeFilter({
            min: 100,
            max: 1000000000
        }),
        new MimeFilter({
            types: [
                'image/jpeg'
            ]
        })
    ];

    uploader.outputs = [
        new FileOutput({
            destFolder: './abc',
            fileName: 'abcd.jpg',
            overwrite: true
        }),
        new BufferOutput({})
    ];

    uploader.on('error', (err) => {
        console.log('error:', err);
    }).on('filtered', (code, pos) => {
        console.log('filtered:', code, 'pos:', pos);
        res.sendStatus(code);
        res.destroy();
    }).on('done', (label, data) => {
        console.log(label, data);
        if (label == 'file') {
            res.sendStatus(200);
        }
    });

    uploader.upload();
});

http.createServer(app).listen(4000);


// for test
// curl -v -X POST http://127.0.0.1:4000 -H "Content-Type:image/jpeg" --data-binary @test.jpg
// curl -v -X POST http://127.0.0.1:4000 -H "Content-Type:image/jpeg" -H "Content-Length:1000" --data-binary @test.jpg