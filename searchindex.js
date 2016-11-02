'use strict'
let fs = require('fs')
// let _ = require('lodash')
let levenshtein = require('fast-levenshtein')

function binarySearchAll(arr, find) {
    let low = 0, high = arr.length - 1,i
    while (low <= high) {
        i = Math.floor((low + high) / 2)
        // comparison = comparator(arr[i], find);
        if (arr[i] < find) { low = i + 1  }
        else { high = i - 1  }
        // low = i + 1;
        // return i
    }
    if (arr[i] !== find && arr[i+1 !== find]) return null
    
    if (arr[i] !== find) i++

    let allPos = []
    while(arr[i] === find){
        allPos.push(i)
        i++
    }
    return allPos
}

function binarySearch(arr, find) {
    let low = 0, high = arr.length - 1,i
    while (low <= high) {
        i = Math.floor((low + high) / 2)
    // comparison = comparator(arr[i], find);
        if (arr[i] < find) { low = i + 1; continue }
        if (arr[i] > find) { high = i - 1; continue }
        return i
    }
    return null
}

function search(field, term, options, cb){
    let origPath = field
    field = field.split('.')
        .map(el => (el.endsWith('[]')? el.substr(0, el.length-2):el ))
        .join('.')

    let readWindow = undefined, windowOffset = undefined
    if (options.exact || options.firstCharExactMatch || options.startsWith) {
        let chars = JSON.parse(fs.readFileSync('./'+field+'.charOffsets.chars'))
        let offsets = require('./loadUint32')('./'+field+'.charOffsets.byteOffsets')
        let lineOffsets = require('./loadUint32')('./'+field+'.charOffsets.lineOffset')
        let pos = binarySearch(chars, term.charAt(0)) 
        readWindow = {start: offsets[pos], end:offsets[pos+1]}
        windowOffset =  lineOffsets[pos]
    }

    const readline = require('readline')
    let stream = fs.createReadStream(field, readWindow)
    const rl = readline.createInterface({ input: stream})

    let checks = []
    if (options.exact) checks.push(line => line == term)
    if (options.levenshtein_distance) checks.push(line => levenshtein.get(line, term) <= options.levenshtein_distance)
    if (options.startsWith) checks.push(line => line.startsWith(term))
    if (options.customCompare) checks.push(line => options.customCompare(line))

    let scores = []
    let hits = [], index = windowOffset
    rl.on('line', (line) => {
        if (checks.every(check => check(line))){
            hits.push(index)
            scores.push(1/(levenshtein.get(line, term)+1))
        }
        index++
    }).on('close', () => {
        let subObjIds = require('./loadUint32')('./'+field+'.subObjIds')
        let mainIds = require('./loadUint32')('./'+field+'.mainIds')
        let valIds = require('./loadUint32')('./'+field+'.valIds')

        let mainds = []
        hits.forEach(hit => binarySearchAll(valIds, hit).map(validIndex => mainds.push(mainIds[validIndex-1])))

        let subObjId = []
        hits.forEach(hit => binarySearchAll(valIds, hit).map(validIndex => subObjId.push(subObjIds[validIndex-1])))
        console.log(subObjId)
        if(cb) cb(mainds, subObjId)
    })

}


let service = {}
service.search = search
module.exports = service
