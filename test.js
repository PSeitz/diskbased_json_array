'use strict'

let jsonfilter = require('./jsonfilter')
let randomaccess = require('./randomaccess')
let _ = require("lodash");

var schema = {
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



let loader = new randomaccess.Loader('random.data')
console.time("readone")
loader.getObjectAtPos(350).then(data => {
    console.timeEnd("readone")
    console.log(data);
})


console.time("readall")
loader.getObjectsAtPos([350, 500, 265, 255, 980, 350, 500, 265, 255, 980]).then(data => {
    console.timeEnd("readall")
    // console.log(data);
})
