'use strict'
var fs = require('fs')
var _ = require('lodash')
var util = require('./util')

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
    text = text.toLowerCase()
    return text.trim()
}

function getAllterms(data, path, options, existingTerms){
    options = options || {}
    let terms = existingTerms || {}

    forEachElementInPath(data, path, (value) => {
        let normalizedText = normalizeText(value)
        terms[normalizedText] = true
        if (options.tokenize) 
            forEachToken(normalizedText, token =>  terms[token] = true)
    })
    if (!existingTerms) return Object.keys(terms).sort() //Level 0
    return terms
}

// let terms = getAllterms(data, "kanji.text".split("."))
// console.log(terms[1000]);


function forEachElementInPath(data, path, cb) {
    path = util.removeArrayMarker(path)
    let paths = path.split('.')
    let valueId = 0
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
                        cb(el, mainId, valueId)
                        valueId++
                    })
                }else{
                    comp = paths[++i] // move to next level
                    for(let subarrEl of currentEl){
                        if (subarrEl[comp] === undefined) continue

                        if (_.last(paths) == comp){
                            cb(subarrEl[comp], mainId, valueId)
                        }else{
                            throw new Error('level 3 not supported')
                        }
                        valueId++
                    }
                }
            }else{
                if (_.last(paths) == comp){
                    cb(currentEl, mainId, valueId)
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

function writeFileSync(file, data){
    fs.writeFileSync(file, data)
}

function forEachToken(normalizedText, cb){
    normalizedText = normalizedText.replace(/[-,.'"]/g, ' ') // remove ' " {}
    normalizedText = normalizedText.replace(/\s\s+/g, ' ') // replace tabs, newlines, double spaces with single spaces
    normalizedText.split(' ').forEach(term => {
        cb(term)
    })

    // const regex = /(\w*)/g
    // let m

    // while ((m = regex.exec(normalizedText)) !== null) {
    //     // This is necessary to avoid infinite loops with zero-width matches
    //     if (m.index === regex.lastIndex) {
    //         regex.lastIndex++
    //     }
        
    //     // The result can be accessed through the `m`-variable.
    //     m.forEach((match) => {
    //         if (match.length >= 2) cb(match)
    //     })
    // }
}

// function isLastPath(paths, path){
//     return paths.indexOf(path) === (paths.length -1)
// }

function createFulltextIndex(data, path, options){
    // let subfolder = options.subfolder || ''
    return new Promise((resolve) => {
        let origPath = path
        path = util.removeArrayMarker(path)

        options = options || {}
        let allTerms = getAllterms(data, path, options)

        let tuples = []
        let tokens = []

        let paths = util.getStepsToAnchor(origPath)
        console.log("StepsToAnchor")
        console.log(paths)

        paths.forEach((pathToAnchor, index) => {
            let level = util.getLevel(pathToAnchor)
            let tuples = []

            let isLast = index === (paths.length -1)

            forEachElementInPath(data, pathToAnchor, function (value, mainId, subObjId) {
                if (isLast){
                    let normalizedText = normalizeText(value)
                    let valId = getValueID(allTerms, normalizedText)

                    // tuples.push((subObjId !== undefined) ? [valId, mainId, subObjId] : [valId, mainId])
                    tuples.push([valId , arguments[level + 1]])
                    if (options.tokenize && normalizedText.split(' ').length > 1) 
                        forEachToken(normalizedText, token => tokens.push([getValueID(allTerms, token), valId]))

                }else{
                    tuples.push([arguments[level + 1], arguments[1]])
                }
            })
            tuples.sort(sortFirstColumn)
            let pathName = util.getPathName(pathToAnchor, isLast) // last path is for the textindex
            writeFileSync(pathName+'.valueIdToParent.valIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[0])).buffer))
            writeFileSync(pathName+'.valueIdToParent.mainIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[1])).buffer))
        })

        // writeFileSync(origPath+'.valIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[0])).buffer))
        // writeFileSync(origPath+'.mainIds', new Buffer(new Uint32Array(tuples.map(tuple => tuple[1])).buffer))

        if (tokens.length > 0) {
            tokens.sort(sortFirstColumn)
            writeFileSync(origPath+'.tokens.tokenValIds', new Buffer(new Uint32Array(tokens.map(tuple => tuple[0])).buffer))
            writeFileSync(origPath+'.tokens.parentValId', new Buffer(new Uint32Array(tokens.map(tuple => tuple[1])).buffer))
        }
        // writeFileSync(path, new Buffer(JSON.stringify(allTerms)))
        writeFileSync(origPath, allTerms.join('\n'))

        creatCharOffsets(origPath, resolve)
    })
    .catch(err => {
        throw new Error('Error while creating index: ' + path + ' : '+err.toString())
    })

}

function creatCharOffsets(path, resolve){

    const readline = require('readline')
    let stream = fs.createReadStream(path)
    const rl = readline.createInterface({ input: stream })

    let offsetsOnly = [], charsOnly = [], lineOffset = []

    let byteOffset = 0, lineNum = 0, currentChar
    rl.on('line', (line, param2) => {
        let firstCharOfLine = line.charAt(0)
        if(currentChar != firstCharOfLine){
            currentChar = firstCharOfLine
            charsOnly.push(currentChar)
            offsetsOnly.push(byteOffset)
            lineOffset.push(lineNum)
            console.log(`${currentChar} ${byteOffset} ${lineNum}`)
        }
        byteOffset+= Buffer.byteLength(line, 'utf8') + 1 // linebreak = 1
        lineNum++
    }).on('close', () => {
        offsetsOnly.push(byteOffset)
        console.log(offsetsOnly)
        writeFileSync(path+'.charOffsets.chars', JSON.stringify(charsOnly))
        writeFileSync(path+'.charOffsets.byteOffsets',  new Buffer(new Uint32Array(offsetsOnly).buffer))
        writeFileSync(path+'.charOffsets.lineOffset',  new Buffer(new Uint32Array(lineOffset).buffer))
        resolve()
    })
}



function createBoostIndex(data, path, options, cb){

    let origPath = path
    path = util.removeArrayMarker(path)

    options = options || {}

    let tuples = []
    forEachElementInPath(data, path, (value, mainId, subObjId) => {
        if (options.type == 'int') {
            tuples.push([subObjId, value])
        }else{
            throw new Error('not implemented')
        }
    })

    tuples.sort(sortFirstColumn)

    writeFileSync(path+'.boost.subObjId', new Buffer(new Uint32Array(tuples.map(tuple => tuple[0])).buffer))
    writeFileSync(path+'.boost.value', new Buffer(new Uint32Array(tuples.map(tuple => tuple[1])).buffer))
}

function createIndices(data, indices){

    return Promise.all(indices.map(index => {
        if (index.fulltext) {
            return createFulltextIndex(data, index.fulltext, index.options)
        }else if(index.boost){
            return createBoostIndex(data, index.boost, index.options)
        }else{
            throw new Error('Choose boost or fulltext')
        }
    }))

}


var service = {}
service.createFulltextIndex = createFulltextIndex
service.createBoostIndex = createBoostIndex
service.createIndices = createIndices
module.exports = service
