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
    // text = text.replace(/\r?\n|\r/g, " "); // replace line breaks with spaces
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
            }else{
                currentEl = currentEl[comp]
                if (_.last(paths) == comp){
                    cb(currentEl, mainId)
                }
            }

        }

    }
}


function createFulltextIndex(data, path, options, cb){
    options = options || {}
    let allTerms = getAllterms(data, path, options)

    let tuples = []
    let tokens = []

    forEachPath(data, path, (value, mainId, subObjId) => {
        let normalizedText = normalizeText(value)
        let valId = getValueID(allTerms, normalizedText)
        if (subObjId) tuples.push([valId, mainId, subObjId])
        else tuples.push([valId, mainId])
        if (options.tokenize && normalizedText.split(' ').length > 1) normalizedText.split(' ').forEach(part => tokens.push([getValueID(allTerms, part), mainId, subObjId, valId]))
    })

    tuples.sort(sortFunction)
    tokens.sort(sortFunction)

    function sortFunction(a, b) {
        if (a[0] === b[0]) {
            return 0
        }
        else {
            return (a[0] < b[0]) ? -1 : 1
        }
    }
    fs.writeFileSync(path+'.valIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[0])).buffer))
    fs.writeFileSync(path+'.mainIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[1])).buffer))
    fs.writeFileSync(path+'.subObjIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[2])).buffer))

    if (tokens.length > 0) {
        fs.writeFileSync(path+'.tokens.valIds', new Buffer(new Uint32Array(tokens.map(tuple => tuple[0])).buffer))
        fs.writeFileSync(path+'.tokens.mainIds', new Buffer(new Uint32Array(tokens.map(tuple => tuple[1])).buffer))
        fs.writeFileSync(path+'.tokens.subObjIds', new Buffer(new Uint32Array(tokens.map(tuple => tuple[2])).buffer))
        fs.writeFileSync(path+'.tokens.parentValId', new Buffer(new Uint32Array(tokens.map(tuple => tuple[3])).buffer))
    }

    // fs.writeFileSync(path, new Buffer(JSON.stringify(allTerms)))
    fs.writeFileSync(path, allTerms.join('\n'))

    creatCharOffsets(path, cb)

}

function creatCharOffsets(path, cb){

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
        if (cb) cb()
    })
}



function createBoostIndex(data, path, options, cb){
    options = options || {}

    let tuples = []
    forEachPath(data, path, (value, mainId, subObjId) => {
        if (options.type == 'int') {
            tuples.push([value, mainId, subObjId])
        }else{
            throw new Error('not implemented')
        }
    })

    fs.writeFileSync(path+'.boost.value', new Buffer(new Uint32Array(tuples.map(tuple => tuple[0])).buffer))
    fs.writeFileSync(path+'.boost.mainIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[1])).buffer))
    fs.writeFileSync(path+'.boost.subObjId', new Buffer(new Uint32Array(tuples.map(tuple => tuple[2])).buffer))
}


var service = {}
service.createFulltextIndex = createFulltextIndex
service.createBoostIndex = createBoostIndex
module.exports = service

// console.time("S_allTerms")
// var asdf = require("./split/S.json")


// var levenshtein = require('fast-levenshtein');
// let searchTerm = 'Salate'
// let results = []
// for(let term of asdf){
//     if(levenshtein.get('scoring', term) <=  1)
//         results.push(term)
// }

// console.timeEnd("S_allTerms")

// console.log(results)

// process.exit(0)


// console.time("allTerms")
// var data2 = fs.readFileSync("allTerms.str", 'utf8').split("\n")
// console.timeEnd("allTerms")

// console.time("allTerms.json")
// var data3 = require("./allTerms.json")
// console.timeEnd("allTerms.json")

// // let offsetByChar = {}
// // let offset = 0
// // let groupbyStart = _.groupBy(data3, term => term[0])
// // for(let char in groupbyStart){
// //  if (char.length == 1 && ['*', ':', '?'].indexOf(char) >= 0) continue
// //  fs.writeFileSync("split/"+char+".json",JSON.stringify(groupbyStart[char]), 'utf8');
// //  offsetByChar[char] = offset
// //  offset += groupbyStart[char].length
// // }

// // fs.writeFileSync("split/offsets.json",JSON.stringify(offsetByChar, null, 2), 'utf8');



// function normalizeText(text){
//     text = text.replace(/ *\([^)]*\) */g, " ");
//     text = text.replace(/[{}'"]/g, "");
//     return text
// }

// // console.log(data)

// let allTerms = []


// function add(term){
//     allTerms[term] = true
// }
// function getTexts(entry, path){
//     let texts = []
//     for(let key in entry[path]){
//         let text = entry[path][key].text
//         text = text.replace(/ *\([^)]*\) */g, " ");
//         text = text.replace(/[{}'"]/g, "");
//         texts.push(text.trim())
//     }
//     return texts
// }

// for(let key in data){
//     let entry = data[key]
//     getTexts(entry, "meanings").forEach(text => text.split(' ').forEach(part => add(text)))
//     getTexts(entry, "meanings").forEach(text => add(text))
//     getTexts(entry, "kana").forEach(text => add(text))
//     getTexts(entry, "kanji").forEach(text => add(text))
// }

// allTerms = Object.keys(allTerms)
// allTerms.sort()



// // let test = ["a", "bb", "cc", "de", "fff"]
// // let hmm = binarySearch(test, "fff")
// // console.log(hmm)

// let buff1 = [];
// let buff2 = [];

// // let termidToEntSeq = {}
// for(let key in data){
//     let entry = data[key]
//     function addToMap(text){
//         // let pos = allTerms.indexOf(text)
//         let pos = binarySearch(allTerms, text)
//         if (text == 'constructor') { return}
//         // termidToEntSeq[pos] = termidToEntSeq[pos] || []
//         // termidToEntSeq[pos].push(entry.ent_seq)

//         buff1.push(pos)
//         buff2.push(entry.ent_seq)
//     }
//     getTexts(entry, "meanings").forEach(text => text.split(' ').forEach(part => addToMap(text)))
//     getTexts(entry, "meanings").forEach(text => addToMap(text))
//     getTexts(entry, "kana").forEach(text => addToMap(text))
//     getTexts(entry, "kanji").forEach(text => addToMap(text))
// }


// fs.writeFileSync("allTerms.json",JSON.stringify(allTerms), 'utf8');
// fs.writeFileSync("allTerms.str",allTerms.join("\n"), 'utf8');
// // fs.writeFileSync("allTermMappings.json", JSON.stringify(termidToEntSeq, null, 2), 'utf8');




// fs.writeFileSync("buff1", new Buffer(new Uint16Array(buff1)))
// fs.writeFileSync("buff2", new Buffer(new Uint16Array(buff2)))

// console.log("finished")