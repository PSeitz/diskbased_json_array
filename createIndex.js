'use strict'
var fs = require('fs')
var _ = require('lodash')


// console.time('jaaa')
// var data = require('./jmdictmin.json')
// console.timeEnd('jaaa')

// console.time('kanji.text')
// var kanjitext = require('./kanji.text')
// console.timeEnd('kanji.text')


var example_schema = {
    'pos': true,
    'misc': true,
    'kanji': [
        {
            'text': true,
            'commonness': true,
            'num_occurences': true,
            'readings': true
        }
    ],
    'kana': [
        {
            'text': true,
            'romaji': true,
            'commonness': true,
            'num_occurences': true
        }
    ],
    'meanings': [
        {
            'text': true,
            'lang': true
        }
    ],
    'ent_seq': true
}

function binarySearch(arr, find) {
    var low = 0, high = arr.length - 1,i
    while (low <= high) {
        i = Math.floor((low + high) / 2)
        // comparison = comparator(arr[i], find);
        if (arr[i] < find) { low = i + 1; continue }
        if (arr[i] > find) { high = i - 1; continue }
        return i
    }
    return null
}

function getValueID(data, value){
    return binarySearch(data, value)
}

function normalizeText(text){
    text = text.replace(/ *\([^)]*\) */g, ' ') // remove everything in braces
    text = text.replace(/[{}'"]/g, '') // remove ' " {}
    text = text.replace(/\s\s+/g, ' ') // replace tabs, newlines, double spaces with single spaces
    return text.trim()
}

function getAllterms(data, path, options, existingTerms){
    options = options || {}
    let terms = existingTerms || {}

    forEachPath(data, path, (value) => {
        let normalizedText = normalizeText(value)
        terms[normalizedText] = true
        if (options.tokenize) normalizedText.split(' ').forEach(part => terms[part] = true)
    })
    if (!existingTerms) return Object.keys(terms).sort() //Level 0
    return terms
}

// let terms = getAllterms(data, "kanji.text".split("."))
// console.log(terms[1000]);


function forEachPath(data, path, cb) {
    let paths = path.split('.')
    let subObjId = 0
    let currentEl
    for (let mainId = 0; mainId < data.length; mainId++) {  
        let entry = data[mainId]
        currentEl = entry
        // let mainId = entry.ent_seq
        for (let i = 0; i < paths.length; i++) {
            let comp = paths[i]
            if (currentEl[comp] === undefined) break
            currentEl = currentEl[comp]

            if(_.isArray(currentEl)){
                if (_.last(paths) == comp){
                    currentEl.forEach(el => {
                        subObjId++
                        cb(el, mainId, subObjId)
                    })
                }else{
                    comp = paths[++i] // move to next level
                    for(let subarrEl of currentEl){
                        if (subarrEl[comp] === undefined) continue
                        subObjId++

                        if (_.last(paths) == comp){
                            cb(subarrEl[comp], mainId, subObjId)
                        }else{
                            throw new Error('level 3 not supported')
                        }
                    }
                }
            }else{
                if (_.last(paths) == comp){
                    cb(currentEl, mainId, subObjId)
                }
            }

        }

    }
}


function sortFirstColumn(a, b) {
    if (a[0] === b[0])
        return 0
    else
        return (a[0] < b[0]) ? -1 : 1
}

function createFulltextIndex(data, path, options){
    // let subfolder = options.subfolder || ''
    return new Promise((resolve, reject) => {
        let origPath = path
        path = path.split('.')
            .map(el => (el.endsWith('[]')? el.substr(0, el.length-2):el ))
            .join('.')

        options = options || {}
        let allTerms = getAllterms(data, path, options)


        let tuples = []
        let tokens = []

        forEachPath(data, path, (value, mainId, subObjId) => {
            let normalizedText = normalizeText(value)
            let valId = getValueID(allTerms, normalizedText)
            if (subObjId) {
                tuples.push([valId, mainId, subObjId])
            }
            else tuples.push([valId, mainId])
            if (options.tokenize && normalizedText.split(' ').length > 1) normalizedText.split(' ').forEach(part => tokens.push([getValueID(allTerms, part), mainId, subObjId, valId]))
        })

        tuples.sort(sortFirstColumn)
        tokens.sort(sortFirstColumn)
        let subObjToMain = tuples.map(el => [el[2], el[1]]).sort(sortFirstColumn)
        subObjToMain = _.uniqBy(subObjToMain, el => el[0])

        fs.writeFileSync(path+'.subObjToMain.subObjIds', new Buffer(new Uint32Array(subObjToMain.map(tuple => tuple[0])).buffer))
        fs.writeFileSync(path+'.subObjToMain.mainIds', new Buffer(new Uint32Array(subObjToMain.map(tuple => tuple[1])).buffer))

        fs.writeFileSync(path+'.valIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[0])).buffer))
        fs.writeFileSync(path+'.mainIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[1])).buffer))

        let subObjIds = tuples.map(tuple => tuple[2])
        fs.writeFileSync(path+'.subObjIds', new Buffer(new Uint32Array(subObjIds).buffer))

        if (tokens.length > 0) {
            fs.writeFileSync(path+'.tokens.valIds', new Buffer(new Uint32Array(tokens.map(tuple => tuple[0])).buffer))
            fs.writeFileSync(path+'.tokens.mainIds', new Buffer(new Uint32Array(tokens.map(tuple => tuple[1])).buffer))
            fs.writeFileSync(path+'.tokens.subObjIds', new Buffer(new Uint32Array(tokens.map(tuple => tuple[2])).buffer))
            fs.writeFileSync(path+'.tokens.parentValId', new Buffer(new Uint32Array(tokens.map(tuple => tuple[3])).buffer))
        }

        // fs.writeFileSync(path, new Buffer(JSON.stringify(allTerms)))
        fs.writeFileSync(path, allTerms.join('\n'))

        creatCharOffsets(path, resolve, reject)
    })

}

function creatCharOffsets(path, resolve, reject){

    const readline = require('readline')
    let stream = fs.createReadStream(path)
    const rl = readline.createInterface({ input: stream })

    let offsetsOnly = [], charsOnly = [], lineOffset = []

    let byteOffset = 0, lineNum = 0, currentChar
    rl.on('line', (line) => {
        let firstCharOfLine = line.charAt(0)
        if(currentChar != firstCharOfLine){
            currentChar = firstCharOfLine
            charsOnly.push(currentChar)
            offsetsOnly.push(byteOffset)
            lineOffset.push(lineNum)
        }
        byteOffset+= Buffer.byteLength(line, 'utf8') + 1 // linebreak = 1
        lineNum++
    }).on('close', () => {
        offsetsOnly.push(byteOffset)
        fs.writeFileSync(path+'.charOffsets.chars', JSON.stringify(charsOnly))
        fs.writeFileSync(path+'.charOffsets.byteOffsets',  new Buffer(new Uint32Array(offsetsOnly).buffer))
        fs.writeFileSync(path+'.charOffsets.lineOffset',  new Buffer(new Uint32Array(lineOffset).buffer))
        resolve()
    })
}



function createBoostIndex(data, path, options, cb){
    let origPath = path
    path = path.split('.')
        .map(el => (el.endsWith('[]')? el.substr(0, el.length-2):el ))
        .join('.')

    options = options || {}

    let tuples = []
    forEachPath(data, path, (value, mainId, subObjId) => {
        if (options.type == 'int') {
            tuples.push([subObjId, value])
        }else{
            throw new Error('not implemented')
        }
    })

    tuples.sort(sortFirstColumn)

    fs.writeFileSync(path+'.boost.subObjId', new Buffer(new Uint32Array(tuples.map(tuple => tuple[0])).buffer))
    fs.writeFileSync(path+'.boost.value', new Buffer(new Uint32Array(tuples.map(tuple => tuple[1])).buffer))
}


var service = {}
service.createFulltextIndex = createFulltextIndex
service.createBoostIndex = createBoostIndex
module.exports = service
