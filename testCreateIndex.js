'use strict'

// let jsonfilter = require('./jsonfilter')
// let randomaccess = require('./randomaccess')
// // let _ = require("lodash");

// function create1(cb){

//     let data = [
//         {
//             'mememings':
//             {
//                 'eng': ['test1', 'test2'],
//                 'ger': ['test4']
//             }
//         }
//     ]

//     let schema = 
//         {
//             'mememings':
//             {
//                 'eng': true,
//                 'ger': true
//             }
//         }


//     let data2 = jsonfilter.filterWithSchema(data, schema)
//     console.log(data2)
//     // randomaccess.writeArray('test/test.data', data)
//     let createindex = require('./createindex')
//     return createindex.createFulltextIndex(data2, 'test', 'mememings.ger[]', {tokenize:true})
// }

// create1().then(() => {
//     console.log("created")
// }).catch((error) => {
//     console.log(error)
// })

let jsonfilter = require('./jsonfilter')
let randomaccess = require('./randomaccess')
// let _ = require("lodash");

let database = require('./database')

var schema = {
    'pos': true,
    'misc': true,
    'kanji': [
        {
            'text': true,
            'commonness': true
            // 'num_occurences': true,
            // 'readings': true
        }
    ],
    'kana': [
        {
            'text': true,
            'romaji': true,
            'commonness': true
            // 'num_occurences': true
        }
    ],
    'meanings':
    {
        'eng': true,
        'ger': true
    }
    ,
    'ent_seq': true
}

return database.createDatabaseFromFile('jmdict.json', 'jmdict',  [
    // { fulltext:'entseq' },
    { fulltext:'kanji[].text' }, 
    { fulltext:'kana[].romaji' }, 
    // { fulltext:'kana[].text' }, 
    // { fulltext:'kanji[].text' }, 
    { fulltext:'meanings.ger[]', options:{tokenize:true} }, 
    { fulltext:'meanings.eng[]', options:{tokenize:true} } 
    // { boost:'kanji[].commonness' , options:{type:'int'}}, 
    // { boost:'kana[].commonness', options:{type:'int'} }
], schema)
.catch(console.log)