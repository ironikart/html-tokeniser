'use strict';
/*eslint no-unused-vars: 0*/
/*globals describe, it, after, before*/
var should = require('chai').should();
var expect = require('chai').expect;
var path = require('path');
var fs = require('fs');
var through = require('through2');
var rimraf = require('rimraf');
var t = require('../index.js');
var helpers = require('./helpers.js');

describe('Transformer', function() {
    var fixture = path.join(__dirname, 'fixtures', 'transform.html');
    var expected = path.join(__dirname, 'expected');
    var tmpDir = path.resolve(__dirname, '.tmp');

    before(function(done) {
        rimraf(tmpDir, function() {
            fs.mkdir(tmpDir, done);
        });
    });

    after(function(done) {
        rimraf(tmpDir, done);
    });

    it('can be required without throwing', function () {
        this.transformer = require(path.resolve(__dirname, '../', 'lib/transform'));
    });

    it('can process a stream of tokens', function (done) {
        var directiveCount = 0;
        var matchCount = 0;
        var matchExpr = /^\s*[a-z]+:[a-z]+/;
        fs.createReadStream(fixture)
            .pipe(t.tokeniser())
            .pipe(through.obj(function(token, enc, cb) {
                if (token.type === 'comment' && matchExpr.test(token.content)) {
                    matchCount += 1;
                }
                this.push(token);
                cb();
            }))
            .pipe(this.transformer({
                start:   matchExpr,
                handler: function(opts, cb) {
                    directiveCount += 1;
                    cb();
                }
            }))
            .resume()
            .on('end', function() {
                matchCount.should.equal(3);
                directiveCount.should.equal(3);
                done();
            });
    });

    it('can process replacements for "blocks"', function (done) {
        var replacement;
        var tokenContent;
        fs.createReadStream(fixture)
          .pipe(t.tokeniser())
          .pipe(this.transformer({
            start:   /^\s*?build:sass\s+([^\s]+)/,
            end:     /^\s*endbuild\s*$/,
            isBlock: true,
            handler: function (block, cb) {
                // Token content match
                expect(block.matches.length).to.equal(2);
                expect(block.matches[1]).to.equal('styles/main.css');

                // Matching token
                expect(block.token).to.have.keys('type', 'content');
                tokenContent = block.token.content;

                // Parsed tokens
                expect(block.tokens.length).to.equal(2);
                expect(block.tokens[0].type).to.equal('open');
                expect(block.tokens[0].attr.href).to.equal('path/to/file.scss');
                expect(block.tokens[0].attr.rel).to.equal('stylesheet');

                replacement = {
                    type: 'open',
                    name: 'link',
                    attr: {
                        rel:  'stylesheet',
                        href: block.matches[1]
                    },
                    selfClosing: true
                };
                cb(null, replacement);
            }
          }))
          .pipe(t.toHTML())
          .pipe(fs.createWriteStream(path.join(tmpDir, 'transform.html'), {encoding: 'utf8'}))
          .on('finish', function() {
            // Test output
            var expectContent = fs.readFileSync(path.join(expected, 'transform.html'), {encoding: 'utf8'});
            var actual = fs.readFileSync(path.join(tmpDir, 'transform.html'), {encoding: 'utf8'});
            expect(expectContent).to.be.equal(actual);

            // Test cached transform data
            var cachedToken = this.transformer.cache.get(' build:sass styles/main.css ');
            var keys = this.transformer.cache.keys();

            expect(cachedToken).not.to.equal(undefined).and.not.to.equal(null);
            expect(keys).to.contain(tokenContent);
            expect(keys.length).to.equal(3);
            expect(cachedToken).to.have.all.keys('type', 'name', 'attr', 'selfClosing');
            expect(cachedToken.attr).to.have.all.keys('rel', 'href');
            expect(cachedToken.name).to.equal('link');
            done();
          }.bind(this));
    });

    it('subsequent parses use cached data', function (done) {
        var matchExpr = /^\s*[a-z]+:[a-z]+/;
        var directiveCount = 0;
        fs.createReadStream(fixture)
            .pipe(t.tokeniser())
            .pipe(this.transformer({
                start:   matchExpr,
                handler: function(opts, cb) {
                    directiveCount += 1;
                    cb();
                }
            }))
            .resume()
            .on('end', function() {
                directiveCount.should.equal(2); // 2 single level tags
                var stats = this.transformer.cache.getStats();
                // Hits should be the number of tranformations + 1 (including the build:) from the previous test
                expect(stats.hits).to.equal(3 + 1);
                done();
            }.bind(this));
    });

    it('can enact transformations on arbitrary matching functions', function(done) {
        fs.createReadStream(fixture)
          .pipe(t.tokeniser())
          .pipe(this.transformer({
            start: function(token) {
                return token.type === 'open' && token.name === 'main';
            },
            end: function(token) {
                return token.type === 'close' && token.name === 'main';
            },
            // Probably wont' cache this sort of transformation since we can't be certain
            // that the match will/should be unique
            cache:   false,
            isBlock: true,
            handler: function(block, cb) {
                // Strips <main>...</main> and inserts custom content
                var tokens = [{
                    type: 'open',
                    name: 'main',
                    attr: {
                        id: 'main'
                    }
                }, {
                    type:    'comment',
                    content: 'This was replaced'
                }, {
                    type: 'close',
                    name: 'main'
                }];
                cb(null, tokens);
            }
          }))
          .pipe(t.toHTML())
          .pipe(fs.createWriteStream(path.join(tmpDir, 'arbitrary.html')))
          .on('finish', function() {
            helpers.compareFiles(
                path.join(tmpDir, 'arbitrary.html'),
                path.join(tmpDir, 'arbitrary.html')
            );
            done();
          });
    });
});
