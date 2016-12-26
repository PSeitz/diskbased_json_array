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
    return paths
}

service.removeArrayMarker = removeArrayMarker
service.getStepsToAnchor = getStepsToAnchor

module.exports = service