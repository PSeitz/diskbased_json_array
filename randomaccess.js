'use strict'
let msgpack = require("msgpack-lite");
let fs = require("fs");

let _ = require("lodash");
let Promise = require("bluebird")
fs = Promise.promisifyAll(fs);

let useMsgPack = true

function getDocAtOffset(file, offset, length, cb){
    let fd = fs.openSync(file, 'r')
    let buf = Buffer(length)
    fs.read(fd, buf, 0, length, offset, (err, bytesRead, buffer) => {
        let data = useMsgPack ? msgpack.decode(buffer) : JSON.parse(buffer.toString())
        fs.closeSync(fd)
        cb(err, data)
    })
}
getDocAtOffset = Promise.promisify(getDocAtOffset);

function writeArray(filename, arr){
    let offsets = []

    let fd = fs.openSync(filename, 'w')
    let currentOffset = 0;
    for (let entry of arr)
    {
        let pack =  useMsgPack ? msgpack.encode(entry) : (new Buffer(JSON.stringify(entry)))
        fs.writeSync(fd, pack, 0, pack.length, currentOffset)
        offsets.push(currentOffset)
        currentOffset += pack.length
    }
    offsets.push(currentOffset)
    fs.closeSync(fd)

    fs.writeFileSync(filename+'.offsets', new Buffer(new Uint32Array(offsets).buffer))

}


class Loader{
    constructor(filename){
        this.filename = filename
        this.offsetLoading = fs.readFileAsync(this.filename+".offsets").then(buf => {
            this.offsets = new Uint32Array(buf.buffer, buf.offset, buf.buffer.length)
            return this.offsets
        })
    }
    getDoc(pos){
        return this.loadOffsets().then(off => getDocAtOffset(this.filename, off[pos], off[pos+1] - off[pos]))
    }
    getDocs(positions){
        return  this.loadOffsets().then(off => Promise.map(positions, pos => getDocAtOffset(this.filename, off[pos], off[pos+1] - off[pos])))
    }
    loadOffsets(){
        if (this.offsets) return Promise.resolve(this.offsets)
        return this.offsetLoading
    }

}


let service = {}
service.writeArray = writeArray
service.Loader = Loader
module.exports = service


