'use strict';
var through = require('through2');
var defaults = require('lodash.defaults');
var cache = require('memory-cache');
var toHTML = require('./toHTML').convertTokenToHTML;

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
    var nested = 0;

    opts = defaults(opts || {}, {
        // Starting tag (regex)
        start: null,

        // Starting nested tag (regex) for blocks
        nestStart: null,

        // End tag
        end: null,

        // Is the transormer a block
        isBlock: false,

        // Cache the result
        cache: true,

        // Callback for starting matches
        onMatchStart: function (match) {
            // ...
        },

        // Handler fn for token data
        handler: function (options, cb) {
            // Signature is function(err, tokens) where tokens is an array
            // of tokenised HTML to re-write at the starting position of the transform
            cb(null, options.token);
        }
    });

    var startMatcher = createMatcher(opts.start);
    var nestMatcher = createMatcher(opts.nestStart);
    var endMatcher = createMatcher(opts.end);

    return through.obj(function eachToken(token, enc, next) {
        var block;
        var cachedTokens;
        var stream = this;

        var matchStart = startMatcher(token);
        var matchEnd = endMatcher(token);
        var matchNested = nestMatcher(token);

        if (matchStart) {
            opts.onMatchStart.call(this, matchStart);
        }

        // Push found tokens into the stream
        function pushTokens(tokens) {
            // Ensure array
            tokens = !Array.isArray(tokens) ? [tokens] : tokens;

            // Push tokens into the stream
            tokens.forEach(function (t) {
                stream.push(t);
            });

            // If there are still open blocks push the resulting
            // token to the last open block
            if (open.length) {
                open[open.length-1].tokens = open[open.length-1].tokens.concat(tokens);
            }

            return tokens;
        }

        // Do a cache check and call the nocache fn when no cache is found
        function cacheCheck(key, noCacheFn) {
            cachedTokens = cache.get(key);
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
                key:     matchStart[0] || toHTML(token),
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
            if (nested >= 1) {
                // Nested block is closing
                open[open.length-1].tokens.push(token);
                nested -= 1;
                opts.onNestChange.call(this, nested);
                next();
            } else {
                // Block is closing
                block = open.pop();
                cacheCheck(block.key, function noCache() {
                    opts.handler(block, function(err, tokens) {
                        if (err) {
                            throw err;
                        }
                        pushTokens(tokens);
                        // Set cache
                        if (opts.cache) {
                            cache.put(block.key, tokens);
                        }
                        next();
                    });
                });
            }
        } else if (matchStart && !opts.isBlock) {
            // It's only a single token replacement
            cacheCheck(token.content, function noCache() {
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
                        cache.put(token.content, tokens);
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
