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

var convertTokenToHTML = function(token) {
  var html = '';
  switch (token.type) {
    case 'open':
      html = elem.open(token.name, token.attr, token.selfClose);
      break;
    case 'close':
      html = elem.close(token.name);
      break;
    case 'text':
      html = token.content;
      break;
    case 'processinginstruction':
      html = elem.open(token.content);
      break;
    case 'comment':
      html = '<!--' + token.content + '-->';
      break;
    default:
      console.log('Unrecognised token type: ', token);
      break;
  }
  return html;
};

require('util').inherits(toHTML, stream.Transform);

toHTML.prototype._transform = function(token, enc, cb) {
  // Ignore invalid tokens
  if (typeof token !== 'object' || !token.type) {
    cb(null);
  }

  this.push(convertTokenToHTML(token));

  cb(null);
};

module.exports = function(options) {
  return new toHTML(options);
};

module.exports.convertTokenToHTML = convertTokenToHTML;