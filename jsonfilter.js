'use strict'
let _ = require('lodash')


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


function filterWithSchemaObj(obj, schema){

    let newEntry = {}
    for(let prop in schema){
        
        if (schema[prop] === true && obj[prop] !== undefined) {
            newEntry[prop] = obj[prop]
        }else if(_.isArray(schema[prop]) && obj[prop] !== undefined){
            let schemaEl = schema[prop][0]
            newEntry[prop] = filterWithSchema(obj[prop], schemaEl)
        }else if(schema[prop] && obj[prop] !== undefined){
            newEntry[prop] = filterWithSchemaObj(obj[prop], schema[prop])
        }
    }
    return newEntry

}

function filterWithSchema(arr, schema){
    return arr.map(entry => filterWithSchemaObj(entry, schema))
}


let service = {}
service.filterWithSchema = filterWithSchema
service.example_schema = example_schema
module.exports = service