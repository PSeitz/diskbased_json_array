'use strict'
console.time('thesearch')
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


// console.time("jmdict.json")
// let data = require("./jmdict.json")
// console.timeEnd("jmdict.json")

// let data2 = jsonfilter.filterWithSchema(data, schema)


// for(let entry of data2){
// 	_.groupBy([6.1, 4.2, 6.3], Math.floor);
// 	entry.meanings = _.groupBy(entry.meanings , 'lang');
// 	if(entry.meanings.ger)entry.meanings.ger = entry.meanings.ger.map(meaning => meaning.text)
// 	if(entry.meanings.eng)entry.meanings.eng = entry.meanings.eng.map(meaning => meaning.text)
// }

// console.log(data[350])
// console.log(JSON.stringify(data2[350], null, 2))
// randomaccess.writeArray('random.data', data2)



// let loader = new randomaccess.Loader('random.data')
// console.time("readone")
// loader.getDoc(350).then(data => {
//     console.timeEnd("readone")
//     console.log(data);
// })

// console.time("readall")
// loader.getDocs([350, 500, 265, 255, 980, 350, 500, 265, 255, 980]).then(data => {
//     console.timeEnd("readall")
//     // console.log(data);
// })

function create(name){

    return database.createDatabaseFromFile('jmdict.json', 'jmdict',  [
        // { fulltext:'entseq' },
        { fulltext:'kanji[].text' }, 
        { fulltext:'kana[].romaji' }, 
        // { fulltext:'kana[].text' }, 
        // { fulltext:'kanji[].text' }, 
        { fulltext:'meanings.ger[]', options:{tokenize:true} }, 
        { fulltext:'meanings.eng[]', options:{tokenize:true} }, 
        { boost:'kanji[].commonness' , options:{type:'int'}}, 
        { boost:'kana[].commonness', options:{type:'int'} }
    ], schema)
    .catch(console.log)

    // let data = require('./jmdict.json')
    // let data2 = jsonfilter.filterWithSchema(data, schema)

    // return createDatabase(data2, name)

    // randomaccess.writeArray('jmdict.data', data2)
    
    // let createindex = require('./createindex')

    // return Promise.all([createindex.createFulltextIndex(data, 'kanji[].text', null),
    //     createindex.createFulltextIndex(data, 'kana[].romaji'),
    //     createindex.createFulltextIndex(data, 'kana[].text'),
    //     createindex.createFulltextIndex(data, 'meanings.ger[]', {tokenize:true}),
    //     createindex.createFulltextIndex(data, 'meanings.eng[]', {tokenize:true}),
    //     createindex.createBoostIndex(data, 'kanji[].commonness', {type:'int'}),
    //     createindex.createBoostIndex(data, 'kana[].commonness', {type:'int'})])
}

// function createDatabase(data, dbfolder){
//     randomaccess.writeArray(dbfolder+'/data', data)
//     let createindex = require('./createindex')
//     return createindex.createIndices(data, dbfolder, [
//         { fulltext:'entseq' },
//         { fulltext:'kanji[].text' }, 
//         { fulltext:'kana[].romaji' }, 
//         { fulltext:'kana[].text' }, 
//         { fulltext:'kanji[].text' }, 
//         { fulltext:'meanings.ger[]', options:{tokenize:true} }, 
//         { fulltext:'meanings.eng[]', options:{tokenize:true} }, 
//         { boost:'kanji[].commonness' , options:{type:'int'}}, 
//         { boost:'kana[].commonness', options:{type:'int'} }
//     ])




//     // return Promise.all([createindex.createFulltextIndex(data, dbfolder, 'kanji[].text', null),
//     //     createindex.createFulltextIndex(data, dbfolder, 'kana[].romaji'),
//     //     createindex.createFulltextIndex(data, dbfolder, 'kana[].text'),
//     //     createindex.createFulltextIndex(data, dbfolder, 'meanings.ger[]', {tokenize:true}),
//     //     createindex.createFulltextIndex(data, dbfolder, 'meanings.eng[]', {tokenize:true}),
//     //     createindex.createBoostIndex(data, dbfolder, 'kanji[].commonness', {type:'int'}),
//     //     createindex.createBoostIndex(data, dbfolder, 'kana[].commonness', {type:'int'})])
// }


function search(dbfolder){

    if (!process.cwd().endsWith(dbfolder))
        process.chdir(process.cwd()+'/'+dbfolder)
    let searchindex = require('./searchindex')

    let request = {
        search: {
            term:'我慢汁',
            path:'kanji[].text',
            levenshtein_distance:1,
            firstCharExactMatch:true
        },
        boost: {
            path:'kanji[].commonness',
            fun: Math.log1p,
            param: +1
        }
    }
    // わが輩
    
    // let mainsIds = searchindex.search('meanings.text', 'ohne Missgeschick', , {exact:true, levenshtein_distance:2})
    return searchindex.search(request, (mainWithScore) => {
        
        // console.log(mainsIds)
        let loader = new randomaccess.Loader('data')
        
        loader.getDocs(mainWithScore.map(el => el.id)).then(data => {
            // console.log('numResults '+data.length)
            // console.log(data.some(entry => {
            //     return entry.kanji && entry.kanji[0] && entry.kanji[0].commonness >0
            // }))
            console.timeEnd('thesearch')
            console.log(JSON.stringify(data.map(entry => entry), null, 2))
        })
    })

}

create()
.then(() => {
    search('jmdict')
})

// search('jmdict')  

// let parentValId = require('fs').readFileSync('meanings.text.tokens.parentValId')
// let parentIds = new Uint32Array(parentValId.buffer, parentValId.offset, parentValId.buffer.length)


// console.log(parentIds.length)

// let loader = new randomaccess.Loader('jmdict.data')
// loader.getDocs([69724]).then(data => {
//     console.log(JSON.stringify(data, null, 2))
// })


// var fs = require('fs')
// var charOffsets = JSON.parse(fs.readFileSync('./kanji.text.charOffsets'))
// const readline = require('readline');
// let stream = fs.createReadStream('kanji.text', {start: charOffsets['意'].start, end:charOffsets['意'].end})
// const rl = readline.createInterface({
//     input: stream
// });

// rl.on('line', (line) => {
//     console.log(line)
// }).on('close', () => {
// });
