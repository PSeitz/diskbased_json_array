'use strict'
/* eslint-env node, mocha */
console.time('thesearch')
let jsonfilter = require('./jsonfilter')
let randomaccess = require('./randomaccess')
// let _ = require("lodash");
let expect = require('chai').expect

var fs = require('fs')
var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath)
            } else { // delete file
                fs.unlinkSync(curPath)
            }
        })
        fs.rmdirSync(path)
    }
}


let database = require('./database')

let data = [
    {
        "kanji": [
            { "text": "偉容", "commonness": 0},
            {"text": "威容","commonness": 5}
        ],
        "kana": [
            {
                "text": "いよう",
                "romaji": "Iyou",
                "commonness": 5,
            }
        ],
        "meanings": {
            "eng" : ["dignity", "majestic appearance"],
            "ger": ["majestätischer Anblick (m)", "majestätisches Aussehen (n)", "Majestät (f)"]
        },
        "ent_seq": "1587680"
    },
    {
        "kanji": [
            { "text": "意欲", "commonness": 40},
            { "text": "意慾", "commonness": 0}
        ],
        "kana": [
            {
                "text": "いよく",
                "romaji": "Iyoku",
                "commonness": 40,
            }
        ],
        "meanings": {
            "eng" : ["will", "desire", "urge"],
            "ger": ["Wollen (n)", "Wille (m)", "Begeisterung (f)"]
        },
        "ent_seq": "1587690"
    }]


let searchDb = require('./searchDb')


describe('Serverless DB', function() {
    let dbfolder = 'mochaTest'
    before(function(done) {
        database.createDatabase(data, dbfolder, [
            // { fulltext:'entseq' },
            // { fulltext:'kanji[].text' }, 
            // { fulltext:'kana[].romaji' }, 
            // { fulltext:'kana[].text' }, 
            // { fulltext:'kanji[].text' }, 
            { fulltext:'meanings.ger[]', options:{tokenize:true} }, 
            // { fulltext:'meanings.eng[]', options:{tokenize:true} }, 
            // { boost:'kanji[].commonness' , options:{type:'int'}}, 
            // { boost:'kana[].commonness', options:{type:'int'} }
        ])
        .then(() => {
            if (!process.cwd().endsWith(dbfolder))
                process.chdir(process.cwd()+'/'+dbfolder)
            done()
        })
    })

    it('should search', function(done) {

        // let searchindex = require('./searchindex')
        searchDb.searchDb('mochaTest', {search: {
            term:'majestätischer',
            path:'meanings.ger[]',
            levenshtein_distance:1,
            firstCharExactMatch:true
        }}).then(data => {
            console.log("ASDFFFFF")
            console.log(JSON.stringify(data, null, 2))
            done()
        })
    })

    it('should extract corect texts', function() {
        let allValues = fs.readFileSync('./meanings.ger', 'utf-8').split('\n')
        expect(allValues).to.eql(['anblick','aussehen','begeisterung','majestät','majestätischer','majestätischer anblick','majestätisches','majestätisches aussehen','wille','wollen'])
    })


    it('should search', function() {
        let mainids = Array.from(require('./loadUint32')('./meanings.ger.mainids'))
        console.log(mainids)
    })


    
    after(function() {
        // deleteFolderRecursive('mochaTest')
    })


})
