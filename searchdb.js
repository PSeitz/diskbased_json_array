'use strict'
console.time('thesearch')
let randomaccess = require('./randomaccess')
let searchindex = require('./searchindex')
let loader = new randomaccess.Loader('data')

function searchDb(dbfolder, request){

    return new Promise( function (resolve) {
        let parentDir = process.cwd()
        if (!process.cwd().endsWith(dbfolder))
            process.chdir(process.cwd()+'/'+dbfolder)
        
        searchindex.search(request, mainWithScore => {
            process.chdir(parentDir)
            loader.getDocs(mainWithScore.map(el => el.id)).then(data => {
                resolve(data)
            })

        })
    })
    
}

let service = {
    searchDb: searchDb
}
module.exports = service