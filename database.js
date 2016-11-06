'use strict'
console.time('thesearch')
let jsonfilter = require('./jsonfilter')
let randomaccess = require('./randomaccess')
let createindex = require('./createindex')

function ensureFolderExists(dbfolder){
    var mkdirp = require('mkdirp')
    mkdirp.sync(dbfolder)
}


function createDatabase(data, dbfolder, indices, filterSchema){
    ensureFolderExists(dbfolder)
    process.chdir(process.cwd()+'/'+dbfolder)

    if(filterSchema)
        data = jsonfilter.filterWithSchema(data, filterSchema)
    randomaccess.writeArray('data', data)
    return createindex.createIndices(data, indices)
}

function createDatabaseFromFile(filename, dbfolder, indices, filterSchema){
    let data = require('./'+filename)
    return createDatabase(data, dbfolder, indices, filterSchema)
}

let service = {
    createDatabase: createDatabase,
    createDatabaseFromFile: createDatabaseFromFile
}
module.exports = service