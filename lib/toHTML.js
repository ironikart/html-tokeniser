'use strict';
var ElementFactory = require('./ElementFactory.js'),
  elem = new ElementFactory({}),
  stream = require('stream');

var toHTML = function(options) {
  this.options = options;
  this.elem = new ElementFactory(options);
  stream.Transform.call(this, {
    objectMode: true
  });
};

require('util').inherits(toHTML, stream.Transform);

toHTML.prototype._transform = function(token, enc, cb) {
  // Ignore invalid tokens
  if (typeof token !== 'object' || !token.type) {
    cb(null);
  }

  switch (token.type) {
    case 'open':
      this.push(elem.open(token.name, token.attr));
      break;
    case 'close':
      this.push(elem.close(token.name));
      break;
    case 'text':
      this.push(token.content);
      break;
    case 'processinginstruction':
      this.push(elem.open(token.content));
      break;
    case 'comment':
      this.push('<!--' + token.content + '-->');
      break;
    default:
      console.error('Unrecognised token type: ', token);
      break;
  }

  cb(null);
};

module.exports = function(options) {
  return new toHTML(options);
};