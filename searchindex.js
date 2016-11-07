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

function getIndex(path){
    return require('./loadUint32')(path)
}

class CharOffset{
    constructor(path){
        this.chars = JSON.parse(fs.readFileSync(path+'.charOffsets.chars'))
        this.byteOffsets = getIndex(path+'.charOffsets.byteOffsets')
        this.lineOffsets = getIndex(path+'.charOffsets.lineOffset')
    }
    getOffsets(char){
        let pos = binarySearch(this.chars, char) 
        let byteOffset = {start: this.byteOffsets[pos], end:this.byteOffsets[pos+1]}
        return {byteOffset: byteOffset, lineOffset: this.lineOffsets[pos]}
    }
}


class ParrallelKeyValueStore{
    constructor(key, value){
        this.keys = typeof key ==='string' ? getIndex(key) : key
        this.values = typeof value ==='string' ? getIndex(value) : value
    }
    getValue(key){
        let pos = binarySearch(this.keys, key)
        return this.values[pos]
    }
}

function removeArrayMarker(path){
    return path.split('.')
        .map(el => (el.endsWith('[]')? el.substr(0, el.length-2):el ))
        .join('.')
}



function search(request, cb){
    let path = request.search.path
    let term = request.search.term
    let options = request.search

    //     let request = {
    //     search: {
    //         term:'我慢汁',
    //         path:'kanji[].text',
    //         levenshtein_distance:1
    //     },
    //     boost: {
    //         attr:'kanji[].commonness',
    //         fun:'log'
    //     }
    // }

    let origPath = path
    path = removeArrayMarker(path)
    console.time('SearchTime Netto')
    let charOffset = {lineOffset:0}
    if (options.exact || options.firstCharExactMatch || options.startsWith) {
        let charOffsets = new CharOffset(path)
        charOffset = charOffsets.getOffsets(term.charAt(0)) 
    }

    const readline = require('readline')
    let stream = fs.createReadStream(path, charOffset.byteOffset)
    const rl = readline.createInterface({ input: stream})

    let checks = []
    if (options.exact !== undefined) checks.push(line => line == term)
    if (options.levenshtein_distance !== undefined) checks.push(line => levenshtein.get(line, term) <= options.levenshtein_distance)
    if (options.startsWith !== undefined) checks.push(line => line.startsWith(term))
    if (options.customCompare !== undefined) checks.push(line => options.customCompare(line))

    let scores = []
    let valueIdHits = [], index = charOffset.lineOffset
    rl.on('line', (line) => {
        if (checks.every(check => check(line))){
            console.log("Hit: "+line)
            valueIdHits.push(index)
            if (options.customScore) scores.push(options.customScore(line, term))
            else scores.push(1/(levenshtein.get(line, term)+1))
        }
        index++
    }).on('close', () => {
        
        // let mainDocIds = getIndex(path+'.mainIds')
        let valIds = getIndex(path+'.valIds')

        let hasTokens = fs.existsSync(path+'.tokens.valIds')
        if (hasTokens)
            var tokenValIds = getIndex(path+'.tokens.valIds')

        let valueIdDocids = []
        let valueIdDocidScores = []
        valueIdHits.forEach((hit, index) => {
            let rows = binarySearchAll(valIds, hit)
            valueIdDocids = valueIdDocids.concat(rows)
            valueIdDocidScores = valueIdDocidScores.concat(rows.map(() => scores[index]))
        }) // For each hit in the fulltextindex, find all rows in the materialized index
        // let mainds = valueIdDocids.map(validIndex => mainDocIds[validIndex]) // For each hit in the materialized index, get the main ids

        let subObjDocIds = getIndex(path+'.subObjIds')
        let subObjIdHits = valueIdDocids.map(validIndex => subObjDocIds[validIndex]) // For each hit in the materialized index, get the subobject ids 
        if (request.boost) {
            let boostPath = removeArrayMarker(request.boost.path)
            let boostkvStore = new ParrallelKeyValueStore(boostPath+'.boost.subObjId', boostPath+'.boost.value')
            let tehBoost = subObjIdHits.map(subObjId => request.boost.fun(boostkvStore.getValue(subObjId) + request.boost.param))
            for (var i = 0; i < valueIdDocidScores.length; i++) {
                valueIdDocidScores[i] = valueIdDocidScores[i] * tehBoost[i]
            }
        }

        let kvStore = new ParrallelKeyValueStore(path+'.subObjToMain.subObjIds', path+'.subObjToMain.mainIds')
        let mainds = subObjIdHits.map(subObjId => kvStore.getValue(subObjId))

        let mainWithScore = mainds.map((id, index) => ({'id':id, 'score':valueIdDocidScores[index]})) // TODO subObjId/valueIdDocidScores => mainid is not 1:1

        mainWithScore.sort(function(a, b) {
            return ((a.score < b.score) ? -1 : ((a.score == b.score) ? 0 : 1))
        })

        console.log(mainWithScore)
        console.timeEnd('SearchTime Netto')
        if(cb) cb(mainWithScore)
    })

}


let service = {}
service.search = search
module.exports = service
