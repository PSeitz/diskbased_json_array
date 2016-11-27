'use strict'
console.time('thesearch')
let randomaccess = require('./randomaccess')
let searchindex = require('./searchindex')


function searchDb(dbfolder, request){

    return new Promise( function (resolve) {
        let parentDir = process.cwd()
        if (!process.cwd().endsWith(dbfolder)){
            console.log(process.cwd()+'/'+dbfolder)
            process.chdir(process.cwd()+'/'+dbfolder)
        }
        
        searchindex.search(request, mainWithScore => {
            process.chdir(parentDir)
            let loader = new randomaccess.Loader(dbfolder)
            // loader.getDocs(mainWithScore.map(el => el.id)).then(data => {
            //     console.log(JSON.stringify(data, null, 2))
            //     resolve(data)
            // })

        })
    })
    
}

let service = {
    searchDb: searchDb
}
module.exports = service