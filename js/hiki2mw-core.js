/*
 * Hiki2MediaWiki for SRW Wiki
 * Core Module
 * 2013-03-10 made by ocha
 */

/*jslint browser: true, bitwise: true, regexp: true */

(function (global) {
    'use strict';

    if (typeof Object.create !== 'function') {
        Object.create = function create(o) {
            var F = function () {};
            F.prototype = o;
            return new F();
        };
    }

    Function.prototype.method = function method(name, func) {
        if (!this.prototype[name]) {
            this.prototype[name] = func;
            return this;
        }
    };

    Number.method('integer', function integer() {
        return Math[this < 0 ? 'ceil' : 'floor'](this);
    });

    String.method('shortenDuplicateLFs', function shortenDuplicateLFs() {
        return this.replace(/\n{3,}/g, '\n\n');
    });

    String.method('trim', function trim() {
        return this.replace(/^\s+/, '').replace(/\s+$/, '');
    });

    String.method('repeat', function repeat(n) {
        var ret = '', str = this;

        while (n) {
            if (n & 1) {
                ret += str;
            }
            n >>>= 1;
            str += str;
        }

        return ret;
    });

    String.method('katakanaToHiragana', function katakanaToHiragana() {
        return this.replace(/[\u30A1-\u30F6]/g, function (ch) {
            return String.fromCharCode(ch.charCodeAt(0) - 0x60);
        });
    });

    String.method('toSurdSound', function toSurdSound() {
        var patternDullSound = '[' +
            'がぎぐげご' +
            'ざじずぜぞ' +
            'だぢづでど' +
            'ばびぶべぼ' +
            ']',
            reDullSound = new RegExp(patternDullSound, 'g'),

            reLongVowelA = /([あかさたなはまやらわ])ー/g,
            reLongVowelI = /([いきしちにひみりゐ])ー/g,
            reLongVowelU = /([うくすつぬふむゆる])ー/g,
            reLongVowelE = /([えけせてねへめれゑ])ー/g,
            reLongVowelO = /([おこそとのほもよろを])ー/g;

        return this.replace(reDullSound, function (ch) {
            return String.fromCharCode(ch.charCodeAt(0) - 1);
        })
            .replace(/\u3094/g, 'う')
            .replace(/[ぱぴぷぺぽ]/g, function (ch) {
                return String.fromCharCode(ch.charCodeAt(0) - 2);
            })
            .replace(/[ぁぃぅぇぉっゃゅょゎ]/g, function (ch) {
                return String.fromCharCode(ch.charCodeAt(0) + 1);
            })
            .replace(/[\u3095\u3096]/g, 'か')
            .replace(reLongVowelA, '$1あ')
            .replace(reLongVowelI, '$1い')
            .replace(reLongVowelU, '$1う')
            .replace(reLongVowelE, '$1え')
            .replace(reLongVowelO, '$1お');
    });

    String.method('punctToSpace', function punctToSpace() {
        return this.replace(/[\u003D\uFF1D\u30A0\u30FB\u0028]/g, ' ')
            .replace(/\u0029/g, '');
    });

    Array.method('indexOf', function indexOf(elt, opt_from) {
        var len = this.length, from = Number(opt_from) || 0;

        from = from.integer();
        if (from < 0) {
            from += len;
        }

        while (from < len) {
            if (from in this && this[from] === elt) {
                return from;
            }
            from += 1;
        }

        return -1;
    });

    var BRACKET_LINK_PATTERN = '\\[\\[.+?\\]\\]',
        URI_PATTERN = "(?:https?|ftp|file|mailto):[A-Za-z0-9;/?:@&=+$,\\-_.!~*'()#%]+",

        convertLineByLine = (function () {
            var lines = [],
                lenLines,

                tables = [],
                lenTables,

                formatRE = {
                    pre: /^[ \t]/,
                    heading: /^!+/,
                    headingComment: /^(\/\/\s*)!+/,
                    quote: /^""/,
                    dList: /^:/,
                    table: /^\|\|/
                },
                determineFormat = function determineFormat(line) {
                    var format;

                    for (format in formatRE) {
                        if (formatRE.hasOwnProperty(format)) {
                            if (formatRE[format].test(line)) {
                                return format;
                            }
                        }
                    }

                    return null;
                },

                h2mwHeading = {
                    level: 0,
                    content: '',
                    comment: false,

                    parent: null,
                    children: [],

                    getLineIndex: function getLineIndex() {
                        return null;
                    },

                    appendTo: function appendTo(parentHeading) {
                        this.parent = parentHeading;
                        parentHeading.children.push(this);

                        return this;
                    }
                },
                newHeading = function newHeading(lineIndex, line, opt_comment) {
                    var that = Object.create(h2mwHeading),
                        strHeading,
                        level,
                        comment = Boolean(opt_comment);

                    that.getLineIndex = function getLineIndex() {
                        return lineIndex;
                    };

                    if (comment) {
                        strHeading = line.slice(
                            formatRE.headingComment.exec(line)[1].length
                        );
                    } else {
                        strHeading = line;
                    }

                    level = formatRE.heading.exec(strHeading)[0].length;
                    that.level = level;
                    that.content = strHeading.slice(level).replace(/[ 　]+（/g, '（');
                    that.comment = comment;

                    that.parent = null;
                    that.children = [];

                    return that;
                },
                headingsRoot = Object.create(h2mwHeading),
                lastHeading,

                appendHeading = function appendHeading(heading) {
                    var parentHeading;

                    if (heading.level > lastHeading.level) {
                        parentHeading = lastHeading;
                    } else {
                        parentHeading = lastHeading.parent;
                        while (heading.level <= parentHeading.level) {
                            if (parentHeading.parent === null) {
                                break;
                            }
                            parentHeading = parentHeading.parent;
                        }
                    }

                    heading.appendTo(parentHeading);
                    lastHeading = heading;
                },

                headingsDFS = function headingsDFS(heading, depth) {
                    var lineIndex = heading.getLineIndex(),
                        levelMW,
                        sourceMW,

                        lenChildren = heading.children.length,
                        i;

                    if (lineIndex !== null) {
                        levelMW = '='.repeat(depth <= 5 ? depth + 1 : 6);
                        sourceMW = '\n' +
                            (heading.comment ? '//' : '') +
                            levelMW + ' ' +
                            heading.content +
                            ' ' + levelMW;
                        lines[lineIndex] = sourceMW;
                    }

                    for (i = 0; i < lenChildren; i += 1) {
                        headingsDFS(heading.children[i], depth + 1);
                    }
                },

                newTable = function newTable(lineIndex) {
                    return {
                        rows: [],
                        getLineIndex: function getLineIndex() {
                            return lineIndex;
                        }
                    };
                },

                h2mwTableColumn = {
                    content: '',
                    heading: false,
                    rowspan: 0,
                    colspan: 0
                },

                newTableRow = (function () {
                    var SPAN_RE = /^[\^>]+/,
                        ROWSPAN_RE = /\^/g,
                        COLSPAN_RE = />/g;

                    function countSpan(str, re) {
                        var matches = str.match(re),
                            count;

                        if (matches) {
                            count = matches.length + 1;
                        } else {
                            count = 0;
                        }

                        return count;
                    }

                    return function newTableRow(line) {
                        var that = {columns: []},
                            cols,
                            lenCols,
                            column,
                            str,
                            matches,
                            i;

                        cols = line.replace(formatRE.table, '').split('||');
                        if (cols[cols.length - 1].length === 0) {
                            cols.pop();
                        }

                        lenCols = cols.length;
                        for (i = 0; i < lenCols; i += 1) {
                            column = Object.create(h2mwTableColumn);
                            str = cols[i];

                            if (str.charAt(0) === '!') {
                                str = str.slice(1);
                                column.heading = true;
                            } else {
                                column.heading = false;
                            }

                            matches = str.match(SPAN_RE);
                            if (matches) {
                                column.content = str.slice(matches[0].length);
                                str = matches[0];
                                column.rowspan = countSpan(str, ROWSPAN_RE);
                                column.colspan = countSpan(str, COLSPAN_RE);
                            } else {
                                column.content = str;
                            }

                            that.columns[i] = column;
                        }

                        return that;
                    };
                }()),

                convertTables = (function () {
                    function markupSpan(column) {
                        var rs = column.rowspan,
                            cs = column.colspan,
                            attributes = [],
                            markup = '';
                        if (rs) {
                            attributes.push('rowspan="' + rs + '"');
                        }
                        if (cs) {
                            attributes.push('colspan="' + cs + '"');
                        }

                        if (attributes.length) {
                            markup = attributes.join(' ') + ' | ';
                        }

                        return markup;
                    }

                    return function convertTables() {
                        var table,
                            row,
                            lenRows,
                            column,
                            lenColumns,
                            lastIsHeading,
                            isHeading,
                            sourceMW,
                            i,
                            j,
                            k;

                        for (i = 0; i < lenTables; i += 1) {
                            table = tables[i];
                            sourceMW = '\n{| class="wikitable"\n';

                            lenRows = table.rows.length;
                            for (j = 0; j < lenRows; j += 1) {
                                row = table.rows[j];
                                sourceMW += '|-\n';

                                if (row.columns[0]) {
                                    column = row.columns[0];
                                    isHeading = column.heading;
                                    sourceMW = sourceMW + (isHeading ? '! ' : '| ') +
                                        markupSpan(column) + column.content;
                                    lastIsHeading = isHeading;

                                    lenColumns = row.columns.length;
                                    for (k = 1; k < lenColumns; k += 1) {
                                        column = row.columns[k];
                                        isHeading = column.heading;
                                        if (isHeading === lastIsHeading) {
                                            sourceMW = sourceMW +
                                                (isHeading ? ' !! ' : ' || ') +
                                                markupSpan(column) +
                                                column.content;
                                        } else {
                                            sourceMW = sourceMW + '\n' +
                                                (isHeading ? '! ' : '| ') +
                                                markupSpan(column) +
                                                column.content;
                                        }
                                        lastIsHeading = isHeading;
                                    }

                                    sourceMW += '\n';
                                }
                            }

                            sourceMW += '|}\n';

                            lines[table.getLineIndex()] = sourceMW;
                        }
                    };
                }()),

                convertDList = (function () {
                    var re = new RegExp('^((?:' + BRACKET_LINK_PATTERN + '|.)*?):');

                    return function convertDList(lineIndex) {
                        var matches, str;

                        str = lines[lineIndex].slice(1);

                        if (str.charAt(0) === ':') {
                            lines[lineIndex] = str;
                        } else {
                            matches = re.exec(str);
                            if (matches) {
                                lines[lineIndex] = ';' + matches[1] + '\n:' +
                                    str.slice(matches[0].length);
                            } else {
                                lines[lineIndex] = ';' + str;
                            }
                        }
                    };
                }()),

                addSortKey = (function () {
                    function makeSortKey(name) {
                        var sortKey = name.katakanaToHiragana()
                                .toSurdSound()
                                .punctToSpace();

                        return '<!-- {{DEFAULTSORT:' + sortKey + '}} -->';
                    }

                    return function addSortKey(name) {
                        if (!(/[^\u0020-\u007E]/.test(name))) {
                            return false;
                        }

                        var zStartParenIndex;

                        if (name.charAt(name.length - 1) === '）') {
                            zStartParenIndex = name.lastIndexOf('（');
                            if (zStartParenIndex > 0) {
                                name = name.slice(0, zStartParenIndex);
                            }
                        }

                        lines.push(makeSortKey(name));

                        return true;
                    };
                }());

            return function convertLineByLine(source) {
                var tableIndex = -1,
                    line,
                    format,
                    lastFormat = null,
                    heading,
                    i;

                lines = source.split('\n');
                lenLines = lines.length;

                headingsRoot.children = [];
                lastHeading = headingsRoot;
                tables = [];

                for (i = 0; i < lenLines; i += 1) {
                    line = lines[i];
                    format = determineFormat(line);

                    switch (format) {
                    case 'pre':
                        if (lastFormat !== 'pre') {
                            lines[i] = '\n<pre>' + line.slice(1);
                        } else {
                            lines[i] = line.slice(1);
                        }
                        break;
                    case 'quote':
                        if (lastFormat !== 'quote') {
                            lines[i] = '\n<blockquote>\n' + line.slice(2);
                        } else {
                            lines[i] = line.slice(2);
                        }
                        break;
                    default:
                        switch (lastFormat) {
                        case 'pre':
                            lines[i - 1] += '</pre>\n';
                            break;
                        case 'quote':
                            lines[i - 1] += '\n</blockquote>\n';
                            break;
                        }

                        switch (format) {
                        case 'table':
                            if (lastFormat !== 'table') {
                                tableIndex += 1;
                                tables[tableIndex] = newTable(i);
                                tables[tableIndex].rows.push(newTableRow(line.trim()));
                            } else {
                                tables[tableIndex].rows.push(newTableRow(line.trim()));
                                lines[i] = '';
                            }
                            break;
                        case 'heading':
                            heading = newHeading(i, line);
                            appendHeading(heading);
                            break;
                        case 'headingComment':
                            heading = newHeading(i, line, true);
                            appendHeading(heading);
                            break;
                        case 'dList':
                            convertDList(i);
                            break;
                        }
                    }

                    lastFormat = format;
                }

                if (headingsRoot.children.length) {
                    headingsDFS(headingsRoot, 0);
                    addSortKey(headingsRoot.children[0].content);
                }

                lenTables = tables.length;
                if (lenTables) {
                    convertTables();
                }

                return lines.join('\n');
            };
        }()),

        convertInBlockBefore = (function () {
            // 取消線
            var delPattern = {
                re: /\==(.*?)==/g,
                replaceStr: '<del>$1</del>'
            };

            return function convertInBlockBefore(source) {
                return source.replace(delPattern.re, delPattern.replaceStr);
            };
        }()),

        convertInBlockAfter = (function () {
            function getLinkPattern(name) {
                return '\\[\\[' + name + '\\]\\]';
            }

            function getPluginPattern(name) {
                return '\\{\\{' + name + '\\}\\}';
            }

            var patterns = [
                // {{toc}}
                {
                    re: new RegExp(getPluginPattern('toc'), 'g'),
                    replaceStr: ''
                },
                // *[[一覧:]]
                {
                    re: new RegExp('^(\\*' + getLinkPattern('一覧:.+?') + ')', 'gm'),
                    replaceStr: '//$1'
                },
                // *[[namazu:]]
                {
                    re: new RegExp('^(\\*' + getLinkPattern('namazu:.+?') + ')', 'gm'),
                    replaceStr: '//$1'
                },
                // [[URI]]
                {
                    re: new RegExp(getLinkPattern('(' + URI_PATTERN + ')'), 'g'),
                    replaceStr: '$1'
                },
                // [[リンク名|URI]]
                {
                    re: new RegExp(getLinkPattern('([^\\]|]+)\\|(' + URI_PATTERN + ')'), 'g'),
                    replaceStr: '[$2 $1]'
                },
                // [[リンク名|ページ名]]
                {
                    re: new RegExp(getLinkPattern('([^\\]|]+)\\|(.*?)'), 'g'),
                    replaceStr: '[[$2|$1]]'
                },
                // {{br}}
                {
                    re: new RegExp(getPluginPattern('br'), 'g'),
                    replaceStr: '<br />'
                },
                // {{isbnImg''}}, {{isbnImg('')}}
                {
                    re: new RegExp(getPluginPattern("isbnImg\\(?'([^']+)'\\)?"), 'g'),
                    replaceStr: '<amazon>$1</amazon>'
                },
                // コメント前の重複改行の除去
                {
                    re: /\n{2,}(\/\/)/g,
                    replaceStr: '\n$1'
                },
                // コメント
                {
                    re: /^\/\/(.*)/gm,
                    replaceStr: '<!-- $1 -->'
                }
            ];

            return function convertInBlock(source) {
                var lenPatterns = patterns.length,
                    pattern,
                    i;

                for (i = 0; i < lenPatterns; i += 1) {
                    pattern = patterns[i];
                    source = source.replace(pattern.re, pattern.replaceStr);
                }

                return source;
            };
        }());

    function convert(source) {
        source = source.replace(/\r\n/g, '\n')
            .shortenDuplicateLFs()
            .trim();

        if (source === '') {
            return '';
        }

        source = convertInBlockBefore(source);
        source = convertLineByLine(source);
        source = convertInBlockAfter(source);

        source = source.shortenDuplicateLFs().trim();

        return source;
    }

    global.HIKI2MW = {
        convert: convert
    };
}(this));
