'use strict'
// let msgpack = require('msgpack-lite')
let decode = require('./node_modules/msgpack-lite/lib/decode').decode
let fs = require('fs')

let useMsgPack = true

function getDocAtOffset(file, offset, length){
    return new Promise((resolve, reject) => {
        let fd = fs.openSync(file, 'r')
        let buf = Buffer(length)
        fs.read(fd, buf, 0, length, offset, (err, bytesRead, buffer) => {
            let data = useMsgPack ? decode(buffer) : JSON.parse(buffer.toString())
            fs.closeSync(fd)
            if (err) return reject(err)
            else resolve(data)
        })
    })

}

function writeArray(filename, arr){
    let encode = require('./node_modules/msgpack-lite/lib/encode').encode
    let offsets = []

    let fd = fs.openSync(filename, 'w')
    let currentOffset = 0
    for (let entry of arr)
    {
        let pack =  useMsgPack ? encode(entry) : (new Buffer(JSON.stringify(entry)))
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
        this.offsetLoading = new Promise((resolve, reject) => {
            fs.readFile(this.filename+'.offsets', (err, buf) => {
                this.offsets = new Uint32Array(buf.buffer, buf.offset, buf.buffer.length)
                if (err) return reject(err)
                resolve(this.offsets)
            })
        })
    }
    getDoc(pos){
        return this.loadOffsets().then(off => getDocAtOffset(this.filename, off[pos], off[pos+1] - off[pos]))
    }
    getDocs(positions){
        return  this.loadOffsets().then(() => Promise.all(positions.map(pos =>this.getDoc(pos))))
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


