/*global describe, it, before */
'use strict';
var fs = require('fs');
var path = require('path');
var chai = require('chai');
var expect = chai.expect;
var t = require('../index.js');
var through = require('through2');

chai.should();

var files = {
  basic: path.resolve(__dirname, './fixtures/basic.html'),
  index: path.resolve(__dirname, './fixtures/index.html'),
  chars: path.resolve(__dirname, './fixtures/characters.html')
};

describe('Tokeniser', function() {

  it('can parse basic html into tokens', function (done) {
    var tokens = [];
    fs.createReadStream(files.basic)
      .pipe(t.tokeniser())
      .on('data', function(token) {
        tokens.push(token);
      })
      .on('finish', function() {
        expect(tokens[0].type).to.equal('processinginstruction');
        expect(tokens[0].content).to.equal('!DOCTYPE html');
        var lastToken = tokens.pop();
        expect(lastToken.type).to.equal('close');
        expect(lastToken.name).to.equal('html');
        done();
      });
  });

  it('can parse a variety of HTML into tokens', function (done) {
    var tokens = [];
    fs.createReadStream(files.index)
      .pipe(t.tokeniser())
      .on('data', function(token) {
        tokens.push(token);
      })
      .on('finish', function() {
        expect(tokens[0].type).to.equal('processinginstruction');
        expect(tokens[0].content).to.equal('!DOCTYPE html');
        var lastToken = tokens.pop();
        expect(lastToken.type).to.equal('close');
        expect(lastToken.name).to.equal('html');
        done();
      });
  });

  it('can be piped to through2 in object mode', function (done) {
    var tokens = [];
    fs.createReadStream(files.index)
      .pipe(t.tokeniser())
      .pipe(through.obj(function(token, enc, cb) {
        tokens.push(token);
        this.push(token);
        cb();
      }))
      // Resume because we aren't piping to a writeable stream
      .resume()
      .on('finish', function() {
        expect(tokens.length).to.equal(71);
        done();
      });
  });

  it('can take tokens and turn them back into HTML', function (done) {
    var content = fs.readFileSync(files.basic, {encoding: 'utf8'});
    var html = '';
    fs.createReadStream(files.basic)
      .pipe(t.tokeniser())
      .pipe(t.toHTML())
      .on('data', function(data) {
        html += data;
      })
      .on('finish', function() {
        // Resulting HTML should be the same as the original content
        expect(content).to.equal(html);
        done();
      });
  });

  it('leaves characters intact', function (done) {
    var content = fs.readFileSync(files.chars, {encoding: 'utf8'});
    var html = '';
    fs.createReadStream(files.chars)
      .pipe(t.tokeniser())
      .pipe(t.toHTML())
      .on('data', function(data) {
        html += data;
      })
      // Write out the file so we can inspect it manually
      .pipe(fs.createWriteStream(path.resolve(__dirname, '.tmp', 'characters.html')))
      .on('finish', function() {
        // Resulting HTML should be the same as the original content
        expect(content).to.equal(html);
        done();
      });
  });

  it('can convert tokens ad hoc by exposing a conversion function', function (done) {
    var token = {
      type:    'comment',
      content: ' This is a comment '
    };
    expect(t.toHTML.convertTokenToHTML(token)).to.equal('<!-- This is a comment -->');
    done();
  });

  it('can force a self closing tag when the token is configured', function (done) {
    var token = {
      type: 'open',
      name: 'script',
      attr: {
        src: 'http://path/to.js'
      },
      selfClose: true
    };
    expect(t.toHTML.convertTokenToHTML(token)).to.equal('<script src="http://path/to.js" />');
    done();
  });
});
