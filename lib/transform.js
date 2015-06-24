'use strict';
var through = require('through2');
var defaults = require('lodash.defaults');
var NodeCache = require('node-cache');
var toHTML = require('./toHTML').convertTokenToHTML;

// Cache instance
var cache = new NodeCache();

// Create a token matcher function
function createMatcher(matcher) {
    if (typeof matcher === 'function') {
        return matcher;
    }
    // Need to return an array of matches, or falsy
    return function(token) {
        if (token.type === 'comment' && matcher) {
            return matcher.exec(token.content);
        }
        return false;
    };
}

module.exports = function (opts) {
    var open = [];

    opts = defaults(opts || {}, {
        start:   null,
        end:     null,
        isBlock: false,
        cache:   true,

        // Handler fn for token data
        handler: function (options, cb) {
            // Signature is function(err, tokens) where tokens is an array
            // of tokenised HTML to re-write at the starting position of the transform
            cb(null);
        }
    });

    var startMatcher = createMatcher(opts.start);
    var endMatcher = createMatcher(opts.end);

    return through.obj(function eachToken(token, enc, next) {
        var block;
        var cachedTokens;
        var stream = this;

        var matchStart = startMatcher(token);
        var matchEnd = endMatcher(token);

        // Push found tokens into the stream
        function pushTokens(tokens) {
            // Ensure array
            tokens = !Array.isArray(tokens) ? [tokens] : tokens;

            // Push tokens into the stream
            tokens.forEach(function (t) {
                stream.push(t);
            });

            return tokens;
        }

        // Do a cache check and call the nocache fn when no cache is found
        function cacheCheck(noCacheFn) {
            cachedTokens = cache.get(token.content);
            if (cachedTokens && opts.cache) {
                pushTokens(cachedTokens);
                next();
            } else {
                noCacheFn();
            }
        }

        if (matchStart && opts.isBlock) {
            // Block is opening
            open.push({
                key:     token.content || toHTML(token),
                token:   token,
                nested:  open.length >= 1,
                matches: matchStart,
                tokens:  []
            });
            next();
        } else if (open.length && opts.isBlock && !matchEnd) {
            // Block is open, push tokens to it
            open[open.length-1].tokens.push(token);
            next();
        } else if (open.length && opts.isBlock && matchEnd) {
            // Block is closing
            block = open.pop();
            cacheCheck(function noCache() {
                opts.handler(block, function(err, tokens) {
                    if (err) {
                        throw err;
                    }
                    pushTokens(tokens);
                    // Set cache
                    if (opts.cache) {
                        cache.set(block.key, tokens);
                    }
                    next();
                });
            });
        } else if (matchStart && !opts.isBlock) {
            // It's only a single token replacement
            cacheCheck(function noCache() {
                opts.handler({
                    token:   token,
                    matches: matchStart
                }, function(err, tokens) {
                    if (err) {
                        throw err;
                    }
                    pushTokens(tokens);
                    // Set cache
                    if (opts.cache) {
                        cache.set(token.content, tokens);
                    }
                    next();
                });
            });
        } else {
            // Pass through unmodified
            stream.push(token);
            next();
        }
    });
};

// Expose cache object for testing
module.exports.cache = cache;
