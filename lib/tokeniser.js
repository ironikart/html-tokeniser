'use strict';
/*eslint no-underscore-dangle: 0*/
var htmlparser = require('htmlparser2');
var through = require('through2');

module.exports = function(options) {
  var tokens = [];
  var parser = new htmlparser.Parser({
    oncomment: function(content) {
      tokens.push({
        type:    'comment',
        content: content
      });
    },
    onopentag: function(name, attr) {
      tokens.push({
        type: 'open',
        name: name,
        attr: attr
      });
    },
    onclosetag: function(name) {
      tokens.push({
        type: 'close',
        name: name
      });
    },
    ontext: function(content) {
      tokens.push({
        type:    'text',
        content: content
      });
    },
    onprocessinginstruction: function(name, data) {
      tokens.push({
        type:    'processinginstruction',
        name:    name,
        content: data
      });
    },
    onerror: function(err) {
      throw err;
    },
    onend: function (err) {
      if (err) {
        throw err;
      }
    }
  }, options);
  return through.obj(function (chunk, enc, cb) {
    parser.write(chunk);
    cb();
  }, function(done) {
    parser.done();
    tokens.forEach(this.push.bind(this));
    done();
  });
};
