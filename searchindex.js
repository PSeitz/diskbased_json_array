'use strict'
var fs = require('fs')
var _ = require('lodash')


var levenshtein = require('fast-levenshtein')

// function binarySearch(arr, find) {
//     var low = 0, high = arr.length - 1,i
//     while (low <= high) {
//         i = Math.floor((low + high) / 2)
//         // comparison = comparator(arr[i], find);
//         if (arr[i] < find) { low = i + 1; continue }
//         if (arr[i] > find) { high = i - 1; continue }
//         return i
//     }
//     return null
// }

function search(field, term, levenshtein_distance){
    
    let hits = []
    var kanjitext = JSON.parse(fs.readFileSync('./'+field))
    for (let i = 0; i < kanjitext.length; i++)
    {
        if(levenshtein.get(kanjitext[i], term) <= levenshtein_distance){
            hits.push(i)
        }
    }

    let mainIdBuf = fs.readFileSync('./'+field+'.mainIds')
    let mainIds = new Uint32Array(mainIdBuf.buffer, mainIdBuf.offset, mainIdBuf.buffer.length)

    
    let mainds = hits.map(valueId => mainIds[valueId])

    // console.log(hits)
    // console.log(mainds)

    // let randomaccess = require('./randomaccess')
    // let loader = new randomaccess.Loader('random.data')
    // loader.getDocs(mainds).then(data => {
    //     console.log(JSON.stringify(data, null, 2))
    // })

    return mainds

}




let service = {}
service.search = search
module.exports = service
