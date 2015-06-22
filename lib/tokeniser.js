'use strict';
/*eslint no-underscore-dangle: 0*/
var htmlparser = require('htmlparser2');
var stream = require('stream');

var Tokeniser = function(options) {
  this.htmlparser = new htmlparser.Parser({
    oncomment: function(content) {
      this.push({
        type:    'comment',
        content: content
      });
    }.bind(this),
    onopentag: function(name, attr) {
      this.push({
        type: 'open',
        name: name,
        attr: attr
      });
    }.bind(this),
    onclosetag: function(name) {
      this.push({
        type: 'close',
        name: name
      });
    }.bind(this),
    ontext: function(content) {
      this.push({
        type:    'text',
        content: content
      });
    }.bind(this),
    onprocessinginstruction: function(name, data) {
      this.push({
        type:    'processinginstruction',
        name:    name,
        content: data
      });
    }.bind(this),
    onerror: function(err) {
      this.emit('error', err);
    }.bind(this),
    onend: function (err) {
      if (err) {
        throw err;
      }
    }
  }, options);
  stream.Transform.call(this, {objectMode: true});
};

require('util').inherits(Tokeniser, stream.Transform);

Tokeniser.prototype._transform = function (chunk, enc, cb) {
  var content = new Buffer('');
  if (Buffer.isBuffer(chunk)) {
    content = chunk;
  } else if (chunk.contents) {
    content = chunk.contents;
  }
  this.htmlparser.write(content);
  cb();
};

Tokeniser.prototype._flush = function (cb) {
  this.htmlparser.done();
  cb();
};

module.exports = function(options) {
  return new Tokeniser(options);
};
