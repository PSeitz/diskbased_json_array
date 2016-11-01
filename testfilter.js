'use strict'
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
var expect = require('chai').expect

var jsonfilter = require('./jsonfilter.js')


describe('JSONFilter', function() {

    var example_schema = {
        'misc': true,
        'kanji': [
            {
                'text': true,
            }
        ]
    }

    it('should filter liek a pro', function() {

        let testObj = [
            {
                'misc': {'yeas':'dacontent'},
                'filterthis': 'ok',
                'kanji': [
                    {
                        'text': 'mytext',
                        'filterthisalso': 'ok'
                    }
                ]
            }
        ]

        let filtered = jsonfilter.filterWithSchema(testObj, example_schema)

        expect(filtered).to.deep.equal([
            {
                'misc': {'yeas':'dacontent'},
                'kanji': [
                    {
                        'text': 'mytext'
                    }
                ]
            }
        ])

    })

})
