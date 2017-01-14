'use strict'
let fs = require('fs')

let service = {}

function removeArrayMarker(path){
    return path.split('.')
        .map(el => (el.endsWith('[]')? el.substr(0, el.length-2):el ))
        .join('.')
}

function getStepsToAnchor(path){
    let paths = []
    let current = []
    let parts = path.split('.')
    parts.forEach(part => {
        current.push(part)
        if (part.endsWith('[]'))
            paths.push(current.join('.'))
    })
    paths.push(path) // add complete path
    return paths
}

function getLevel(path){
    return (path.match(/\[\]/g) || []).length
}

function getPathName(pathToAnchor, isTextIndexPart){
    return pathToAnchor + (isTextIndexPart?'.textindex':'')
}

service.removeArrayMarker = removeArrayMarker
service.getStepsToAnchor = getStepsToAnchor
service.getLevel = getLevel
service.getPathName = getPathName

module.exports = service