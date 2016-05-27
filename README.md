# raw-uploader
Raw body upload library for node.js.

## Getting Started

Install it in node.js:

```
npm install raw-uploader
```

```javascript
var uploader = require('raw-uploader');
```

Then use it in express.js

```javascript
app.post('/', function (req, res) {
    uploader({
        contentTypes: ['image/jpeg'],
        minFileSize: 100,
        maxFileSize: 1000000000,
        outputType: 'file',
        destFolder: './test',
        createDestFolder: true,
        disconnectOnErr: true,
        fileNameHeader: 'file-name',
        destFileName: 'test',
        overwrite: true,
        deepCheckMime: true
    }, req, res, function (code, data) {
        res.status(code);
        res.end();
    });
});

```
## API

### uploader([`options`, `req`, `res` [, `callback`]])

Upload file.


* `params` - (Object) Optional to apply. Properties may include:

  * `contentTypes` - (Array) Content type filters as Array.
  * `minFileSize` - (Number gt 0) Minimum limit of upload file size. Default: `0`.
  * `maxFileSize` - (Number gt 0) Maximize limit of upload file size.
  * `outputType` - (String `"file"` or `"buffer"`) Output to file or buffer. Default: `"buffer"`
  * `destFolder` - (String) Output folder. Default `"./"`.
  * `createDestFolder` - (Boolean) Auto create output folder if not exists. Default: `false`.
  * `disconnectOnErr` - (Boolean) Disconnect when upload failed. Default `false`.
  * `fileNameHeader` - (String) File name from request header. Default: `UUID`
  * `destFileName` - (String) Destination file name, overwrite `fileNameHeader`.
  * `overwrite` - (String) Overwrite any existing file in destination folder. Default `false`.
  * `deepCheckMime` - (Boolean) Check mime type for a file. Default `false`.
* `req` - (Object) Express.js request object.
* `res` - (Object) Express.js response object.
* `callback` - (Function) Callback function.
  * `code` - (Number) HTTP code.
  * `data` - (Buffer or String)
    * `outputType="buffer"`: return file buffer.
    * `outputType="file"`: return dest file path.

## Example

Upload file buffer:

```javascript
app.post('/', function (req, res) {
    uploader({
        contentTypes: ['image/png'],
        minFileSize: 100,
        maxFileSize: 1024 * 100,
        outputType: 'buffer',
        disconnectOnErr: true,
        deepCheckMime: true
    }, req, res, function (code, data) {
        console.log(data);
        res.status(code);
        res.end();
    });
});
```

Upload file to '/image' folder:

```javascript
app.post('/', function (req, res) {
    uploader({
        contentTypes: ['image/jpeg'],
        minFileSize: 100,
        maxFileSize: 1024 * 100,
        outputType: 'file',
        destFolder: '/image',
        createDestFolder: true,
        disconnectOnErr: true,
        fileNameHeader: 'file-name',
        destFileName: 'test',
        overwrite: true,
        deepCheckMime: true
    }, req, res, function (code, dest) {
        console.log(dest);
        res.status(code);
        res.end();
    });
});
```