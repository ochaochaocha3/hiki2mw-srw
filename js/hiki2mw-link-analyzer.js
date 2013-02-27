/*
 * Hiki2MediaWiki for SRW Wiki
 * Link analyzer
 * 2013-02-27 Ver. 2.2.0 made by ocha
 */

/*jslint regexp: true */

(function (global) {
    'use strict';

    if (typeof Object.create !== 'function') {
        Object.create = function (o) {
            var F = function () {};
            F.prototype = o;
            return new F();
        };
    }

    var analyzeLinks = (function () {
        var BRACKET_LINK_PATTERN = '\\[\\[.+?\\]\\]',
            URI_PATTERN = '(?:https?|ftp|file|mailto):[A-Za-z0-9;/?:@&=+$,\\-_.!~*\'()#%]+',
            URI_LINK_PATTERN = '\\[' + URI_PATTERN + '.+?\\]',
            WIKI_NAME_PATTERN = '\\b(?:[A-Z]+[a-z]+[a-z\\d]+){2,}\\b',

            lines = [],
            lenLines,

            reLink = new RegExp(BRACKET_LINK_PATTERN, 'g'),
            reWikiName = new RegExp(
                '(?:' + BRACKET_LINK_PATTERN + ')|' +
                    '(?:' + URI_LINK_PATTERN + ')|' +
                    '(?:' + WIKI_NAME_PATTERN + ')',
                'g'
            ),

            newFunctionLineChar = function newFunctionLineChar(o) {
                return function newObjectLineChar(lineIndex, charIndex) {
                    var that = Object.create(o);

                    that.getLineIndex = function getLineIndex() {
                        return lineIndex;
                    };

                    that.getLineNumber = function getLineNumber() {
                        return lineIndex + 1;
                    };

                    that.getCharIndex = function charIndex() {
                        return charIndex;
                    };

                    that.getCharNumber = function getCharNumber() {
                        return charIndex + 1;
                    };

                    return that;
                };
            },

            h2mwLinkMW = {
                link: '', // [[]]の中身

                toString: function toString() {
                    return '[[' + this.link + ']]';
                },

                isPiped: function isPiped() {
                    return (/\|/.test(this.link));
                },
                getPageName: function getPageName() {
                    var link = this.link,
                        pipeIndex = link.indexOf('|'),
                        pageName = pipeIndex !== -1 ?
                                link.slice(0, pipeIndex) :
                                link;

                    // ページ名の先頭が“|”の場合は“|”を外す
                    //（MediaWikiの処理）
                    if (pageName.charAt(0) === '|') {
                        pageName = pageName.slice(1);
                    }

                    return pageName;
                },
                getLinkText: function getLinkText() {
                    var link = this.link,
                        pipeIndex = link.indexOf('|'),
                        linkText = pipeIndex !== -1 ?
                                link.slice(pipeIndex + 1) :
                                link;

                    return linkText;
                }
            },
            newLinkMW = newFunctionLineChar(h2mwLinkMW),

            h2mwWikiName = {
                pageName: '',

                toString: function toString() {
                    return this.pageName;
                }
            },
            newWikiName = newFunctionLineChar(h2mwWikiName);

        return function analyzeLinks(sourceMW) {
            var result = {},

                line,

                linksAlphabet = [],
                linkAlphabet,

                linksParenthesis = [],
                linkParenthesis,

                wikiNames = [],
                wikiName,

                matches,

                link,
                pageName,
                lastChar,

                i;

            lines = sourceMW.split('\n');
            lenLines = lines.length;

            for (i = 0; i < lenLines; i += 1) {
                line = lines[i];
                reLink.lastIndex = reWikiName.lastIndex = 0;

                matches = reLink.exec(line);
                while (matches) {
                    link = matches[0].slice(2, -2);
                    pageName = h2mwLinkMW.getPageName.apply({link: link}, []);

                    // 英字名ページへのリンク
                    if (!/[^ -~]/.test(pageName)) {
                        // lastIndexは“]”の桁
                        linkAlphabet = newLinkMW(i,
                            reLink.lastIndex - matches[0].length);
                        linkAlphabet.link = link;
                        linksAlphabet.push(linkAlphabet);
                    }

                    lastChar = pageName.charAt(pageName.length - 1);
                    if (lastChar === ')' || lastChar === '）') {
                        if (/[(（]/.test(pageName)) {
                            linkParenthesis = newLinkMW(i,
                                reLink.lastIndex - matches[0].length);
                            linkParenthesis.link = link;
                            linksParenthesis.push(linkParenthesis);
                        }
                    }

                    matches = reLink.exec(line);
                }

                matches = reWikiName.exec(line);
                while (matches) {
                    if (matches[0].charAt(0) !== '[') {
                        pageName = matches[0];
                        wikiName = newWikiName(i,
                            reWikiName.lastIndex - pageName.length);
                        wikiName.pageName = pageName;
                        wikiNames.push(wikiName);
                    }

                    matches = reWikiName.exec(line);
                }
            }

            result.linksAlphabet = linksAlphabet;
            result.linksParenthesis = linksParenthesis;
            result.wikiNames = wikiNames;
            return result;
        };
    }());

    global.HIKI2MW.analyzeLinks = analyzeLinks;
}(this));
