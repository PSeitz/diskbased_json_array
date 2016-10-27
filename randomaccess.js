'use strict'
let msgpack = require("msgpack-lite");
let fs = require("fs");
let _ = require("lodash");
let Promise = require("bluebird")

let useMsgPack = true

function getObject(file, offset, length, cb){
    let fd = fs.openSync('random.data', 'r')
    let buf = Buffer(length)
    fs.read(fd, buf, 0, length, offset, (err, bytesRead, buffer) => {
        let data = useMsgPack ? msgpack.decode(buffer) : JSON.parse(buffer.toString())
        fs.closeSync(fd)
        cb(err, data)
    })
}
getObject = Promise.promisify(getObject);

function getObjectAtPos(file, pos, offsets){
    return getObject(file, offsets[pos], offsets[pos+1] - offsets[pos])
}

function getObjectsAtPos(file, positions, offsets){
    return Promise.map(positions, pos => getObjectAtPos(file, pos, offsets))
}

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
        this.offsets = new Uint32Array(fs.readFileSync(filename+".offsets").buffer)
    }
    getObjectAtPos(pos){
        return getObject(this.filename, this.offsets[pos], this.offsets[pos+1] - this.offsets[pos])
    }
    getObjectsAtPos(positions){
        return Promise.map(positions, pos => getObjectAtPos(this.filename, pos, this.offsets))
    }

}


let service = {}
service.writeArray = writeArray
service.getObjectAtPos = getObjectAtPos
service.getObjectsAtPos = getObjectsAtPos
service.Loader = Loader
module.exports = service


