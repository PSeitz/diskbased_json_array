'use strict'
/* eslint-env node, mocha */
console.time('thesearch')
let jsonfilter = require('./jsonfilter')
let util = require('./util')
let randomaccess = require('./randomaccess')
// let _ = require("lodash");
let chai = require('chai')
let chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

let expect = require('chai').expect
let should = require('chai').should()

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
    {                                           // anchor id 0
        "kanji": [
            { "text": "偉容", "commonness": 0}, // kanji id 0
            { "text": "威容","commonness": 5}   // kanji id 1
        ],
        "kana": [
            {
                "text": "いよう",
                "romaji": "Iyou",
                "commonness": 5,
            }
        ],
        "meanings": {   // meanings id 0
            "eng" : ["dignity", "majestic appearance"],
            "ger": ["majestätischer Anblick (m)", "majestätisches Aussehen (n)", "Majestät (f)"] // meanings.ger id 0, 1, 2 .. 
        },
        "ent_seq": "1587680"
    },
    {                                           // anchor id 1
        "kanji": [
            { "text": "意欲", "commonness": 40}, // kanji id 2
            { "text": "意慾", "commonness": 0}   // kanji id 3
        ],
        "kana": [
            {
                "text": "いよく",
                "romaji": "Iyoku",
                "commonness": 40,
            }
        ],
        "meanings": { // meanings id 1
            "eng" : ["will", "desire", "urge"],
            "ger": ["Wollen (n)", "Wille (m)", "Begeisterung (f)"] // meanings.ger id .. 5, 6 7 
        },
        "ent_seq": "1587690"
    }]


let searchDb = require('./searchDb')


describe('Serverless DB', function() {
    let dbfolder = 'mochaTest'
    this.timeout(10000)
    before(function(done) {
        database.createDatabase(data, dbfolder, [
            { fulltext:'ent_seq' },
            // { fulltext:'kanji[].text' }, 
            // { fulltext:'kana[].romaji' }, 
            // { fulltext:'kana[].text' }, 
            { fulltext:'kanji[].text' }, 
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

    it('should search tokenized and levensthein', function() {
        return searchDb.searchDb('mochaTest', {search: {
            term:'majestätischer',
            path:'meanings.ger[]',
            levenshtein_distance:1,
            firstCharExactMatch:true
        }}).then(res => {
            // console.log(JSON.stringify(res, null, 2))
            return res
        })
        .should.eventually.have.length(1)
    })

    it('should search word non tokenized', function() {
        console.log("test search123123123")
        console.log(process.cwd())
        return searchDb.searchDb('mochaTest', {search: {
            term:'偉容',
            path:'kanji[].text',
            levenshtein_distance:0,
            firstCharExactMatch:true
        }}).then(res => {
            // console.log(JSON.stringify(res, null, 2))
            return res
        })
        .should.eventually.have.length(1)
    })

    // it('should search on non subobject', function() {
    //     return searchDb.searchDb('mochaTest', {search: {
    //         term:'1587690',
    //         path:'ent_seq',
    //         levenshtein_distance:0,
    //         firstCharExactMatch:true
    //     }}).then(res => {
    //         // console.log(JSON.stringify(res, null, 2))
    //         return res
    //     })
    //     .should.eventually.have.length(1)
    // })

    it('should extract corect texts', function() {
        let allValues = fs.readFileSync('./meanings.ger[]', 'utf-8').split('\n')
        expect(allValues).to.eql(['anblick','aussehen','begeisterung','majestät','majestätischer','majestätischer anblick','majestätisches','majestätisches aussehen','wille','wollen'])
    })

    it('should detect the path to anchor', function() {
        expect(util.getStepsToAnchor('kanji[].text')).to.eql(['kanji[]', 'kanji[].text'])
        expect(util.getStepsToAnchor('meanings.ger[]')).to.eql(['meanings.ger[]', 'meanings.ger[]'])
    })

    
    // it('should search', function() {
    //     let mainids = Array.from(require('./loadUint32')('./meanings.ger.mainids'))
    //     console.log(mainids)
    // })

    after(function() {
        // deleteFolderRecursive('mochaTest')
    })

})
