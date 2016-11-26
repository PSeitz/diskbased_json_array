'use strict'
const fs = require('fs')
module.exports = function (path) {
    let buf = fs.readFileSync(path)
    return new Uint32Array(buf.buffer, buf.offset, buf.byteLength/4)
}