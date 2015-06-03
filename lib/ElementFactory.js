'use strict';
var ElementFactory = function(options) {
  options = options || {};
  this.selfClosing = options.selfClosing ||
    ['meta', 'link', 'br', 'hr', 'input', 'img', 'embed', 'keygen', 'base', 'area',
     'col', 'command', 'param', 'source', 'track', 'wbr'];
};

ElementFactory.prototype.open = function(name, attr, selfClose) {
  attr = attr || {};

  var tag = '<';
  tag += name;
  for (var key in attr) {
    tag += ' ' + key + '="' + attr[key] + '"';
  }
  tag += ((this.selfClosing.indexOf(name) !== -1 || selfClose) ? ' /' : '') + '>';
  return tag;
};

ElementFactory.prototype.close = function(name) {
  if (this.selfClosing.indexOf(name) !== -1) {
    return '';
  }
  return '</' + name + '>';
};

module.exports = ElementFactory;