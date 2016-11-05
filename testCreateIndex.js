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
                'eng': ['test1'],
                'ger': ['test2']
            }
        }
    ]

    // randomaccess.writeArray('test/test.data', data)
    let createindex = require('./createindex')
    return createindex.createFulltextIndex(data, 'mememings.ger[]', {tokenize:true})
}

create1().then(() => {
    console.log("created")
})

