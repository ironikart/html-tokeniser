/*global describe, before, it */
'use strict';
var fs = require('fs'),
  path = require('path'),
  chai = require('chai'),
  expect = chai.expect,
  t = require('../index.js');

chai.should();

var files = {
  basic: path.resolve(__dirname, './fixtures/basic.html')
};

describe('Tokeniser', function() {

  this.timeout(10*1000);

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

  it('can take tokens and turn them back into HTML', function (done) {
    var content = fs.readFileSync(files.basic, {encoding: 'utf8'});
    var html = '';
    fs.createReadStream(files.basic)
      .pipe(t.tokeniser())
      .pause()
      .pipe(t.toHTML())
      .on('data', function(data) {
        html += data;
      })
      .resume()
      .on('finish', function() {
        // Resulting HTML should be the same as the original content
        expect(content).to.equal(html);
        done();
      });
  });

  it('can convert tokens ad hoc by exposing a conversion function', function (done) {
    var token = {
      type: 'comment',
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