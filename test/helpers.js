'use strict';
var expect = require('chai').expect;
var through = require('through2');
var fs = require('fs');

// Helpers

// Compare the contents of one file to another
function compareFiles(a, b) {
    var fileA = fs.readFileSync(a, {encoding: 'utf8'});
    var fileB = fs.readFileSync(b, {encoding: 'utf8'});
    expect(fileA).to.equal(fileB);
}

// Log a stream to the console
function logStream() {
    return through.obj(function(obj, enc, cb) {
        console.log('log: ', obj);
        cb(null, obj);
    });
}

exports.compareFiles = compareFiles;
exports.logStream = logStream;
