'use strict'
var fs = require('fs')
var _ = require('lodash');


console.time("jaaa")
var data = require("./jmdict.json");
console.timeEnd("jaaa")



var example_schema = {
    "pos": true,
    "misc": true,
    "kanji": [
        {
            "text": true,
            "commonness": true,
            "num_occurences": true,
            "readings": true
        }
    ],
    "kana": [
        {
            "text": true,
            "romaji": true,
            "commonness": true,
            "num_occurences": true
        }
    ],
    "meanings": [
        {
            "text": true,
            "lang": true
        }
    ],
    "ent_seq": true
};

function getPath(path){
    return path.split(".")
}

function addValue(values, value){
    values.add(value)
    return values.length()
}

function getValueID(data, value){
    data.indexOf(value)
}

function isArray(pathComp){
    if (comp.endsWith('[]')) {
        return pathComp.substring(0, comp.length - 2);
    }
    return false
}

function getAllterms(arr, path, target){
    path = path.split(".")
    return arr.forEach(entry => {
        for(let comp of path){
            if (comp === true && entry[prop]) {
                newEntry[prop] = entry[prop]
            }else if(isArray(comp) && entry[prop]){
                let schemaEl = comp[0]

                newEntry[prop] = filterWithSchema(entry[prop], schemaEl)
            }
        }
    })

}

function getAllterms(data, path){

    let allTerms = {}

    for(let entry of data){
        currentEl = entry
        components.forEach(comp => {
            if (comp.endsWith('[]')) {
                comp = comp.substring(0, comp.length - 2);
                currentEl = currentEl[comp]
                let subarr = entry[comp]
                for(let subarrEl of subarr){
                    
                }

            }else{
                currentEl = currentEl[comp]
                if (_.last(components) == comp){
                    allTerms[currentEl] = true
                }
            }

        })

    }

    allTerms = Object.keys(allTerms)
    allTerms.sort()
    return allTerms
}



function createFulltextIndex(data, path){
    let components = getPath(path)
    if(_.last(components).endsWith('[]')) throw new Error("No!")
    let attributeName = _.last(components)
    let attrId = 0
    let currentEl;
    let indexValues = []

    let valIds = []
    let mainIds = []

    for(let entry of data){
        currentEl = entry
        let mainId = entry.ent_seq
        for(let comp of components){
            if (comp.endsWith('[]')) {
                comp = comp.substring(0, comp.length - 2);
                currentEl = currentEl[comp]
                let subarr = entry[comp]
                for(let subarrEl of subarr){
                    
                }

            }else{
                currentEl = currentEl[comp]
                if (_.last(components) == comp){
                    let valId = getValueID(data, currentEl)
                    valIds.push(valId)
                    mainIds.push(mainIds)
                }
            }

        }

    }
}

function createBoostIndex(data, path){

}



createFulltextIndex(data, "kanji[].text")

createBoostIndex(data, "kanji[].commonness")



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


// function binarySearch(arr, find) {
//   var low = 0, high = arr.length - 1,i;
//   while (low <= high) {
//     i = Math.floor((low + high) / 2);
//     // comparison = comparator(arr[i], find);
//     if (arr[i] < find) { low = i + 1; continue; };
//     if (arr[i] > find) { high = i - 1; continue; };
//     return i;
//   }
//   return null;
// };

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