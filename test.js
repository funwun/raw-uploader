var express = require('express');
var app = express();
var uploader = require('raw-uploader');
var http = require('http');

app.post('/', function (req, res) {
    uploader({
        contentTypes: ['image/png', 'text/plain'],
        minFileSize: 100,
        maxFileSize: 1000000000,
        outputType: 'file',
        destFolder: './abc',
        createDestFolder: true,
        disconnectOnErr: true,
        fileNameHeader: 'file-name',
        destFileName: 'test',
        overwrite: true,
        deepCheckMime: true
    }, req, res, function (code, data) {
        console.log(code, data);
        res.status(code);
        res.end();
    });
});

http.createServer(app).listen(4000);


// for test
// curl -v -X POST http://127.0.0.1:4000 -H "Content-Type:image/jpeg" --data-binary @test.jpg
