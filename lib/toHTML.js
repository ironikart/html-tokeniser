'use strict';
/*eslint no-underscore-dangle: 0*/
var ElementFactory = require('./ElementFactory.js');
var elem = new ElementFactory({});
var stream = require('stream');

var ToHTML = function(options) {
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

require('util').inherits(ToHTML, stream.Transform);

ToHTML.prototype._transform = function(token, enc, cb) {
  // Ignore invalid tokens
  if (typeof token !== 'object' || !token.type) {
    cb(null);
  }

  this.push(convertTokenToHTML(token));

  cb(null);
};

module.exports = function(options) {
  return new ToHTML(options);
};

module.exports.convertTokenToHTML = convertTokenToHTML;
