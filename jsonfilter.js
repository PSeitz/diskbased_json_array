'use strict'
let _ = require("lodash");


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


function filterWithSchema(arr, schema){

	return arr.map(entry => {
	    let newEntry = {}
	    for(let prop in schema){
	        if (schema[prop] === true && entry[prop]) {
	            newEntry[prop] = entry[prop]
	        }else if(_.isArray(schema[prop]) && entry[prop]){
	            let schemaEl = schema[prop][0]

	            newEntry[prop] = entry[prop].map(entryEl => {
	                let newEl = {}
	                for(let schemaElProp in schemaEl){
	                    if (schemaEl[schemaElProp] === true && entryEl[schemaElProp]) {
	                        newEl[schemaElProp] = entryEl[schemaElProp]
	                    }
	                }
	                return newEl
	            })
	        }
	    }
	    return newEntry
	})


}


let service = {}
service.filterWithSchema = filterWithSchema
service.example_schema = example_schema
module.exports = service