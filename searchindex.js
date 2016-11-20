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
    getClosestOffset(linePos){
        for (var pos = 0; pos < this.lineOffsets.length; pos++) {
            if(this.lineOffsets[pos] > linePos) {
                pos--
                break
            }
        }
        let byteRange = {start: this.byteOffsets[pos], end:this.byteOffsets[pos+1]}
        return {byteRange: byteRange, lineOffset: this.lineOffsets[pos]}
    }
    getOffsetInfo(char){
        let pos = binarySearch(this.chars, char) 
        let byteRange = {start: this.byteOffsets[pos], end:this.byteOffsets[pos+1]}
        return {byteRange: byteRange, lineOffset: this.lineOffsets[pos]}
    }
}

class IndexKeyValueStore{
    constructor(key, value1, value2){
        this.keys = typeof key ==='string' ? getIndex(key) : key
        this.values1 = typeof value1 ==='string' ? getIndex(value1) : value1
        if(value2) this.values2 = typeof value2 ==='string' ? getIndex(value2) : value2
    }
    getValue1(key){
        let pos = binarySearch(this.keys, key)
        return this.values1[pos]
    }
    getValue2(key){
        let pos = binarySearch(this.keys, key)
        return this.values2[pos]
    }
}

class TokensIndexKeyValueStore{
    constructor(path){
        this.path = path
        this.store = new IndexKeyValueStore(path+'.tokens.valIds', path+'.tokens.parentValId', path+'.tokens.subObjIds')
    }
    get keys() { return this.store.keys }
    get parentValIds(){ return this.store.values1 }
    get subObjIds(){ return this.store.values2 }
    getParentValId(key){
        return this.store.getValue1(key)
    }
    getSubObjId(key){
        return this.store.getValue2(key)
    }
    getParent(index){
        return getLine(this.path, this.parentValIds[index])
    }
}


function removeArrayMarker(path){
    return path.split('.')
        .map(el => (el.endsWith('[]')? el.substr(0, el.length-2):el ))
        .join('.')
}

function getHitsIndexDocids(valueIdHits, scoreHits, valIdsIndex){

    let valueIdDocids = []
    let valueIdDocidScores = []
    valueIdHits.forEach((hit, index) => {
        let rows = binarySearchAll(valIdsIndex, hit)
        valueIdDocids = valueIdDocids.concat(rows)
        valueIdDocidScores = valueIdDocidScores.concat(rows.map(() => scoreHits[index]))
    }) // For each hit in the fulltextindex, find all rows in the materialized index
    return {
        valueIdDocids:valueIdDocids,
        valueIdDocidScores: valueIdDocidScores
    }
}

let charOffsetCache = {}

function getCreateCharOffsets(path) {
    charOffsetCache.path = charOffsetCache.path || new CharOffset(path)
    return charOffsetCache.path
}

function getTextLines(options, onLine){ //options: path, char
    let charOffset = {lineOffset:0}
    if(options.char){
        charOffset = getCreateCharOffsets(options.path).getOffsetInfo(options.char)
        console.log("START: " + charOffset.lineOffset)
    }
    if (options.linePos) {
        charOffset = getCreateCharOffsets(options.path).getClosestOffset(options.linePos)
    }
    return new Promise(resolve => {
        const readline = require('readline')
        let stream = fs.createReadStream(options.path, charOffset.byteRange)
        const rl = readline.createInterface({ input: stream})
        rl.on('line', line => {
            onLine(line, charOffset.lineOffset)
            charOffset.lineOffset++
        })
        rl.on('close', resolve)
    })
}

function getLine(path, linePos){ //options: path, char
    return new Promise(resolve => {
        getTextLines({path:path, linePos:linePos}, (lineText, currentLinePos) => {
            if (currentLinePos == linePos) {
                // console.log(lineText)
                resolve(lineText)
            }
        })
    })
}

function tokenResults(term, path, valueIdHits, scoreHits, result, subObjIdHits){
    let hasTokens = fs.existsSync(path+'.tokens.valIds')
    if (!hasTokens) return Promise.resolve()

    let tokenKVData = new TokensIndexKeyValueStore(path)
    let tokenResult = getHitsIndexDocids(valueIdHits, scoreHits, tokenKVData.keys)
    console.log(tokenResult)
    return Promise.all(tokenResult.valueIdDocids.map(validIndex => {
        return tokenKVData.getParent(validIndex).then(parentString => {
            result.valueIdDocidScores.push(1/(levenshtein.get(parentString, term)+1))
            subObjIdHits.push(tokenKVData.subObjIds[validIndex])
        })
    }))
}

function getHits(path, options, term){
    let scoreHits = []
    let valueIdHits = []
    let checks = []
    if (options.exact !== undefined) checks.push(line => line == term)
    if (options.levenshtein_distance !== undefined) checks.push(line => levenshtein.get(line, term) <= options.levenshtein_distance)
    if (options.startsWith !== undefined) checks.push(line => line.startsWith(term))
    if (options.customCompare !== undefined) checks.push(line => options.customCompare(line))

    return getTextLines({path:path, char:term.charAt(0)}, (line, linePos) => {
        console.log("Check: "+line + " linePos:"+linePos)
        if (checks.every(check => check(line))){
            console.log("Hit: "+line + " linePos:"+linePos)
            valueIdHits.push(linePos)
            if (options.customScore) scoreHits.push(options.customScore(line, term))
            else scoreHits.push(1/(levenshtein.get(line, term)+1))
        }
    }).then(() => {
        return {scoreHits:scoreHits, valueIdHits:valueIdHits}
    })
}

function search(request, cb){


    let path = request.search.path
    let term = request.search.term.toLowerCase()
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
    
    // let checks = []
    // if (options.exact !== undefined) checks.push(line => line == term)
    // if (options.levenshtein_distance !== undefined) checks.push(line => levenshtein.get(line, term) <= options.levenshtein_distance)
    // if (options.startsWith !== undefined) checks.push(line => line.startsWith(term))
    // if (options.customCompare !== undefined) checks.push(line => options.customCompare(line))

    getHits(path, options, term)
    // getTextLines({path:path, char:term.charAt(0)}, (line, linePos) => {
    //     console.log("Check: "+line + " linePos:"+linePos)
    //     if (checks.every(check => check(line))){
    //         console.log("Hit: "+line + " linePos:"+linePos)
    //         valueIdHits.push(linePos)
    //         if (options.customScore) scoreHits.push(options.customScore(line, term))
    //         else scoreHits.push(1/(levenshtein.get(line, term)+1))
    //     }
    // })
    .then(res => {
        let scoreHits = res.scoreHits
        let valueIdHits = res.valueIdHits
        console.log("valueIdHits")
        console.log(valueIdHits)
        // let mainDocIds = getIndex(path+'.mainIds')
        let valIds = getIndex(path+'.valIds')
        let result = getHitsIndexDocids(valueIdHits, scoreHits, valIds) 
        console.log(result)
        let subObjDocIds = getIndex(path+'.subObjIds')
        let subObjIdHits = result.valueIdDocids.map(validIndex => subObjDocIds[validIndex]) // For each hit in the materialized index, get the subobject ids 

        tokenResults(term, path, valueIdHits, scoreHits, result, subObjIdHits).then(()=> {
            if (request.boost) {
                let boostPath = removeArrayMarker(request.boost.path)
                let boostkvStore = new IndexKeyValueStore(boostPath+'.boost.subObjId', boostPath+'.boost.value')
                let tehBoost = subObjIdHits.map(subObjId => request.boost.fun(boostkvStore.getValue1(subObjId) + request.boost.param))
                for (var i = 0; i < result.valueIdDocidScores.length; i++) {
                    result.valueIdDocidScores[i] = result.valueIdDocidScores[i] * tehBoost[i]
                }
            }

            let kvStore = new IndexKeyValueStore(path+'.subObjToMain.subObjIds', path+'.subObjToMain.mainIds')
            let mainds = subObjIdHits.map(subObjId => kvStore.getValue1(subObjId))

            let mainWithScore = mainds.map((id, index) => ({'id':id, 'score':result.valueIdDocidScores[index]})) // TODO subObjId/valueIdDocidScores => mainid is not 1:1

            mainWithScore.sort(function(a, b) {
                return ((a.score > b.score) ? -1 : ((a.score == b.score) ? 0 : 1))
            })

            console.log(mainWithScore)
            console.timeEnd('SearchTime Netto')
            if(cb) cb(mainWithScore)
        })


    })


}


let service = {}
service.getHits = getHits
service.search = search
module.exports = service
