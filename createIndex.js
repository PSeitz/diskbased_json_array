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

function getAllterms(arr, path, existingTerms){
    let terms = existingTerms || {}
    arr.forEach(entry => {
        let current = entry
        for (let i = 0; i < path.length; i++) {
            let comp = path[i]
            if (current[comp] === undefined) break
            current = current[comp]
            if(current && _.isArray(current)){
                getAllterms(current, path.slice(i+1), terms)
                // terms = terms.concat()
            }else if (_.last(path) == comp){
                terms[current] = true
            }
        }
    })
    if (!existingTerms) return Object.keys(terms).sort() //Level 0
    return terms
}

// let terms = getAllterms(data, "kanji.text".split("."))
// console.log(terms[1000]);



function createFulltextIndex(data, path){
    let paths = path.split('.')

    let allTerms = getAllterms(data, paths)
    let attributeName = _.last(paths)

    let valIds = []
    let mainIds = []
    let subObjIds = []
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
                        let valId = getValueID(allTerms, subarrEl[comp])
                        valIds.push(valId)
                        mainIds.push(mainId)
                        subObjIds.push(subObjId)

                        if (valId == 72473) {
                            console.log("Creating ValueId " + valId)
                            console.log(subarrEl[comp])
                            console.log("mainId "+mainId)
                            console.log(entry.ent_seq)
                        }

                        // console.log(valId + " " + mainId + " " + subObjId);
                    }else{
                        throw new Error('level 3 not supported')
                    }
                }
            }else{
                currentEl = currentEl[comp]
                if (_.last(paths) == comp){
                    let valId = getValueID(data, currentEl)
                    valIds.push(valId)
                    mainIds.push(mainId)
                }
            }

        }

    }

    fs.writeFileSync(path+'.mainIds', new Buffer(new Uint32Array(mainIds).buffer))
    fs.writeFileSync(path+'.subObjIds', new Buffer(new Uint32Array(subObjIds).buffer))
    fs.writeFileSync(path, JSON.stringify(allTerms))

}

function createBoostIndex(data, path){

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