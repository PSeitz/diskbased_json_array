'use strict'
console.time('thesearch')
let jsonfilter = require('./jsonfilter')
let randomaccess = require('./randomaccess')
// let _ = require("lodash");

function create1(cb){

    let data = [
        {
            'mememings':
            {
                'eng': ['test1', 'test2'],
                'ger': ['test4']
            }
        }
    ]

    let schema = 
        {
            'mememings':
            {
                'eng': true,
                'ger': true
            }
        }


    let data2 = jsonfilter.filterWithSchema(data, schema)
    console.log(data2)
    // randomaccess.writeArray('test/test.data', data)
    let createindex = require('./createindex')
    return createindex.createFulltextIndex(data2, 'test', 'mememings.ger[]', {tokenize:true})
}

create1().then(() => {
    console.log("created")
}).catch((error) => {
    console.log(error)
})

