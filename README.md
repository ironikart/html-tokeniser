#HTML Tokeniser

[htmlparser2]: https://github.com/fb55/htmlparser2/

A streaming tokeniser that uses [htmlparser2]() to convert string content into a stream of token objects and another transform stream to convert them back into HTML at the other end.

This is something I found myself reusing a bit, a quick html parser that extracted HTML attributes and produced a flat stream of tokens instead of a DOM tree. It will do some conversion of recognised self closing tags so if you have `<link rel="stylesheet"></link>` it will be transformed into `<link rel="stylesheet" />`.

##Usage

### Files
```javascript
var t = require('html-tokeniser'),
    fs = require('fs');

fs.createReadStream('file.html')
  .pipe(t.tokeniser())
  .on('data', function (token) {
    console.log(token);
  });
```

### Urls
```javascript
// npm install request
var request = require('request');

request('http://www.example.com')
  .pipe(t.tokeniser())
  .on('data', function (token) {
    console.log(token);
  });
```

###Re-forming HTML from tokens
```javascript
// npm install map-stream
var map = require('map-stream');

request('http://www.example.com')
  .pipe(t.tokeniser())
  .pipe(map(function(token, cb){
    // Transform the token, or remove it
    cb(null, token);
  }))
  .pipe(t.toHTML())
  .pipe(fs.createWriteStream('example.html'));
```

###tokeniser options

Any options passed to tokeniser will be automatically passed onto [htmlparser2]()

Example:
```javascript
//...
t.tokeniser({
  recognizeCDATA: false
})
//...
```

###toHTML options

`selfClosingTags`
A list of tag names to automatically self close. Ensure that these tags do *NOT* contain content otherwise the rendered result will be screwy.
*default:* `['meta', 'link', 'br', 'hr', 'input', 'img', 'embed', 'keygen', 'base', 'area', 'col', 'command', 'param', 'source', 'track', 'wbr']`