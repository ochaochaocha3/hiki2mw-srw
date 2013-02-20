/*
 * Core of Hiki2MediaWiki for SRW Wiki
 * 2012-08-16 Ver. 2.0.4 made by ocha
 */

/*jslint browser: true, bitwise: true, regexp: true */

var hiki2MW = function () {
    'use strict';

    /*
     * プロトタイプ拡張
     */

    // オブジェクト

    // 新しいオブジェクトの生成
    if (typeof Object.create !== 'function') {
        Object.create = function (o) {
            var F = function () {};
            F.prototype = o;
            return new F();
        };
    }

    // 関数

    // メソッドの追加
    Function.prototype.method = function (name, func) {
        if (!this.prototype[name]) {
            this.prototype[name] = func;
            return this;
        }
    };

    // 数

    // 整数部分を取り出す
    Number.method('integer', function () {
        return Math[this < 0 ? 'ceil' : 'floor'](this);
    });

    // 文字列

    // 重複改行の除去
    String.method('shortenDuplicateLFs', function () {
        return this.replace(/\n{3,}/g, '\n\n');
    });

    // 先頭・末尾の空白の除去
    String.method('trim', function () {
        return this.replace(/^\s+/, '').replace(/\s+$/, '');
    });

    // 冪乗を利用した高速な文字列の繰り返し
    String.method('repeat', function (n) {
        var ret = '', str = this;

        while (n > 0) {
            if (n & 1) {
                ret += str;
            }
            n >>>= 1;
            str += str;
        }

        return ret;
    });

    // 配列

    // indexOf
    Array.method('indexOf', function (elt, opt_from) {
        var len = this.length,
            from = Number(opt_from) || 0;

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

    /*
     * 定数
     */

    var DEBUG = false,

        BRACKET_LINK_RE = '\\[\\[.+?\\]\\]',
        URI_RE = '(?:https?|ftp|file|mailto):[A-Za-z0-9;/?:@&=+$,\\-_.!~*\'()#%]+',
        URI_LINK_RE = '\\[' + URI_RE + '.+?\\]',
        WIKI_NAME_RE = '\\b(?:[A-Z]+[a-z]+[a-z\\d]+){2,}\\b',

    /*
     * 関数
     */

        // 行ごとの変換
        convertLineByLine = (function () {
            var lines = [],
                lenLines,
                tables = [],
                lenTables,

                // 書式の判定
                formatREs = {
                    pre: /^[ \t]/,
                    heading: /^!+/,
                    headingComment: /^\/\/(\s*)!+/,
                    quote: /^""/,
                    dList: /^:/,
                    table: /^\|\|/
                },
                determineFormat = function (line) {
                    var format;

                    for (format in formatREs) {
                        if (formatREs.hasOwnProperty(format)) {
                            if (formatREs[format].test(line)) {
                                return format;
                            }
                        }
                    }

                    return null;
                },

                // 見出し

                // オブジェクト
                h2mwHeading = {
                    level: 0,
                    content: '',
                    comment: false,

                    parent: null,
                    children: [],

                    appendTo: function (parentHeading) {
                        this.parent = parentHeading;
                        parentHeading.children.push(this);

                        return this;
                    }
                },
                newHeading = function (lineIndex, line) {
                    var that = Object.create(h2mwHeading),
                        level = formatREs.heading.exec(line)[0].length;

                    that.getLineIndex = function () {
                        return lineIndex;
                    };
                    that.level = level;
                    that.content = line.slice(level)
                        .replace(/[ 　]+（/g, '（');
                    that.children = [];

                    return that;
                },
                headingsRoot,
                lastHeading,

                // コレクションへの追加
                appendHeading = function (heading) {
                    var parentHeading;

                    if (heading.level > lastHeading.level) {
                        parentHeading = lastHeading;
                    } else {
                        parentHeading = lastHeading.parent;
                        // 遡って親を探す
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

                // 幅優先探索と変換処理
                headingsBFS = function (root) {
                    if (!root || root.children.length === 0) {
                        return false;
                    }

                    var queue = [], // キュー。要素は配列
                        lenQueue,
                        lenChildren,
                        buffer = [], // 子配列を保存する配列
                        depth = 1,
                        heading,

                        level,
                        str,
                        sourceMW,

                        i,
                        j;

                    queue.push(root.children);
                    while (true) {
                        level = depth <= 5 ? depth + 1 : 6;
                        str = '='.repeat(level);

                        lenQueue = queue.length;
                        for (i = 0; i < lenQueue; i += 1) {
                            lenChildren = queue[i].length;
                            for (j = 0; j < lenChildren; j += 1) {
                                heading = queue[i][j];

                                sourceMW = '\n' +
                                    (heading.comment ? '//' : '') +
                                    str + ' ' +
                                    heading.content +
                                    ' ' + str;
                                lines[heading.getLineIndex()] = sourceMW;

                                if (heading.children.length > 0) {
                                    buffer.push(heading.children);
                                }
                            }
                        }

                        if (buffer.length === 0) {
                            break;
                        }

                        queue = buffer.concat(); // キューに子配列の配列をコピー
                        buffer.length = 0; // 子配列の配列を空にする

                        depth += 1;
                    }

                    return true;
                },

                // 表

                // オブジェクト
                newTable = function (lineIndex) {
                    var that = {
                        rows: [],
                        getLineIndex: function () {
                            return lineIndex;
                        }
                    };
                    return that;
                },

                h2mwTableColumn = {
                    content: '',
                    heading: false,
                    rowspan: 0,
                    colspan: 0
                },

                newTableRow = (function () {
                    var countSpan = function (str, chRE) {
                            var matches = str.match(new RegExp(chRE, 'g')),
                                count;

                            if (matches !== null) {
                                count = matches.length + 1;
                            } else {
                                count = 0;
                            }

                            return count;
                        };

                    return function (line) {
                        var that = {columns: []},
                            cols,
                            lenCols,
                            column,
                            str,
                            matches,
                            i;

                        cols = line.replace(formatREs.table, '').split('||');
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

                            matches = str.match(/^[\^>]+/);
                            if (matches !== null) {
                                column.content = str.slice(matches[0].length);
                                str = matches[0];
                                column.rowspan = countSpan(str, '\\^');
                                column.colspan = countSpan(str, '>');
                            } else {
                                column.content = str;
                            }

                            that.columns[i] = column;
                        }

                        return that;
                    };
                }()),

                // 変換処理
                convertTables = (function () {
                    var markupSpan = function (column) {
                            var rs = column.rowspan,
                                cs = column.colspan,
                                ary = [],
                                markup = '';

                            if (rs > 0) {
                                ary.push('rowspan="' + rs + '"');
                            }
                            if (cs > 0) {
                                ary.push('colspan="' + cs + '"');
                            }

                            if (ary.length > 0) {
                                markup = ary.join(' ') + ' | ';
                            }

                            return markup;
                        };

                    return function () {
                        var table,
                            row,
                            lenRows,
                            column,
                            lenColumns,
                            lastIsHeading,
                            isHeading,
                            str,
                            i,
                            j,
                            k;

                        for (i = 0; i < lenTables; i += 1) {
                            table = tables[i];
                            str = '\n{| class="wikitable"\n';

                            lenRows = table.rows.length;
                            for (j = 0; j < lenRows; j += 1) {
                                row = table.rows[j];
                                str += '|-\n';

                                if (row.columns[0]) {
                                    column = row.columns[0];
                                    isHeading = column.heading;
                                    str = str + (isHeading ? '! ' : '| ') +
                                        markupSpan(column) + column.content;
                                    lastIsHeading = isHeading;

                                    lenColumns = row.columns.length;
                                    for (k = 1; k < lenColumns; k += 1) {
                                        column = row.columns[k];
                                        isHeading = column.heading;
                                        if (isHeading === lastIsHeading) {
                                            str = str +
                                                (isHeading ? ' !! ' : ' || ') +
                                                markupSpan(column) +
                                                column.content;
                                        } else {
                                            str = str + '\n' +
                                                (isHeading ? '! ' : '| ') +
                                                markupSpan(column) +
                                                column.content;
                                        }
                                        lastIsHeading = isHeading;
                                    }

                                    str += '\n';
                                }
                            }

                            str += '|}\n';

                            lines[table.getLineIndex()] = str;
                        }
                    };
                }()),

                // 定義リスト
                convertDList = (function () {
                    var pattern = '^((?:' + BRACKET_LINK_RE + '|.)*?):',
                        re = new RegExp(pattern);

                    return function (lineIndex) {
                        var matches,
                            str;

                        str = lines[lineIndex].slice(1);

                        if (str.charAt(0) === ':') {
                            lines[lineIndex] = str;
                        } else {
                            matches = re.exec(str);
                            if (matches !== null) {
                                lines[lineIndex] = ';' + matches[1] + '\n:' +
                                    str.slice(matches[0].length);
                            } else {
                                lines[lineIndex] = ';' + str;
                            }
                        }
                    };
                }()),

                // ソートキー
                addSortKey = (function () {
                    String.prototype.katakanaToHiragana = function () {
                        return this.replace(/[\u30A1-\u30F6]/g, function (ch) {
                            return String.fromCharCode(ch.charCodeAt(0) - 0x60);
                        });
                    };

                    String.prototype.toSurdSound = function () {
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
                    };

                    String.prototype.punctToSpace = function () {
                        return this.replace(/[\u003D\uFF1D\u30A0\u30FB\u0028]/g, ' ')
                            .replace(/\u0029/g, '');
                    };

                    var makeSortKey = function (name) {
                        var sortKey = name.katakanaToHiragana()
                                .toSurdSound()
                                .punctToSpace();

                        return '<!-- {{DEFAULTSORT:' + sortKey + '}} -->';
                    };

                    return function (name) {
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

            if (DEBUG) {
                h2mwHeading.toString = function () {
                    return 'h' + this.level + ': ' + this.content;
                };

                h2mwTableColumn.toString = function () {
                    var str, ary = [];

                    str = (this.heading ? 'h: ' : '') + this.content;

                    if (this.rowspan) {
                        ary.push('rowspan: ' + this.rowspan);
                    }
                    if (this.colspan) {
                        ary.push('colspan: ' + this.colspan);
                    }

                    if (ary.length > 0) {
                        str = str + ' (' + ary.join(', ') + ')';
                    }

                    return str;
                };
            }

            return function (source) {
                var tableIndex = -1,
                    line,
                    format,
                    lastFormat = null,
                    heading,
                    strHeading,
                    matches = [],
                    i;

                lines = source.split('\n');
                lenLines = lines.length;

                // コレクションの初期化
                headingsRoot = Object.create(h2mwHeading);
                headingsRoot.children = [];
                lastHeading = headingsRoot;
                tables = [];

                for (i = 0; i < lenLines; i += 1) {
                    line = lines[i];
                    format = determineFormat(line);

                    switch (format) {
                    case 'pre':
                        if (lastFormat !== 'pre') {
                            // 開始タグ
                            lines[i] = '\n<pre>' + line.slice(1);
                        } else {
                            lines[i] = line.slice(1);
                        }
                        break;
                    case 'quote':
                        if (lastFormat !== 'quote') {
                            // 開始タグ
                            lines[i] = '\n<blockquote>\n' + line.slice(2);
                        } else {
                            lines[i] = line.slice(2);
                        }
                        break;
                    default:
                        // 終了タグ
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
                            matches = formatREs.headingComment.exec(line);
                            strHeading = line.slice(2 + matches[1].length);
                            heading = newHeading(i, strHeading);
                            heading.comment = true;
                            appendHeading(heading);
                            break;
                        case 'dList':
                            convertDList(i);
                            break;
                        }
                    }

                    lastFormat = format;
                }

                // 見出し
                if (headingsRoot.children.length > 0) {
                    headingsBFS(headingsRoot);
                    addSortKey(headingsRoot.children[0].content);
                }

                // 表
                lenTables = tables.length;
                if (lenTables > 0) {
                    convertTables();
                }

                return lines.join('\n');
            };
        }()),

        // 一括変換
        convertInBlockBefore = function (source) {
            var result = source;

            // 取消線
            result = result.replace((/\==(.*?)==/g), '<del>$1</del>');

            return result;
        },

        convertInBlockAfter = (function () {
            // 正規表現のパターンを得る関数
                // リンク
            var getExpLink = function (name) {
                    return '\\[\\[' + name + '\\]\\]';
                },

                // プラグイン
                getExpPlugin = function (name) {
                    return '\\{\\{' + name + '\\}\\}';
                };

            return function (source) {
                var strRE, result;

                result = source;

                // 不要な要素をコメントアウトまたは削除
                strRE = getExpPlugin('toc');
                result = result.replace(new RegExp(strRE, 'g'), '');
                result = result.replace(/^\*\[\[一覧:/gm, '//*[[一覧:');
                result = result.replace(/^\*\[\[namazu:/gm, '//*[[namazu:');

                // URIリンク
                strRE = getExpLink('(' + URI_RE + ')');
                result = result.replace(new RegExp(strRE, 'g'), '$1');
                strRE = getExpLink('([^\\|\\]]+)\\|(' + URI_RE + ')');
                result = result.replace(new RegExp(strRE, 'g'), '[$2 $1]');

                // パイプ付きリンク
                strRE = getExpLink('([^\\|\\]]+)\\|(.*?)');
                result = result.replace(new RegExp(strRE, 'g'), '[[$2|$1]]');

                // 強制改行
                strRE = getExpPlugin('br');
                result = result.replace(new RegExp(strRE, 'g'), '<br />');

                // Amazonリンク
                strRE = getExpPlugin('isbnImg\\(?\'([^\']+)\'\\)?');
                result = result.replace(new RegExp(strRE, 'g'),
                    '<amazon>$1<\/amazon>');

                // コメント
                result = result.replace(/\n{2,}\/\//g,
                    '\n//'); // 重複改行を除去
                result = result.replace(/^\/\/(.*)/gm, '<!-- $1 -->');

                return result;
            };
        }()),

        // 変換処理
        convert = function (source) {
            // 改行コードを統一
            source = source.replace(/\r\n/g, '\n');

            // 重複改行、先頭・末尾の空白を除去
            source = source.shortenDuplicateLFs().trim();

            // ソースが空ならば処理しない
            if (source === '') {
                return '';
            }

            source = convertInBlockBefore(source);
            source = convertLineByLine(source);
            source = convertInBlockAfter(source);

            // 重複改行、先頭・末尾の空白を除去
            source = source.shortenDuplicateLFs().trim();

            return source;
        },

        // リンクの解析
        analyzeLinks = (function () {
            var lines = [],
                lenLines,
                reLink,
                reWikiName,
                aryPattern = [],

                // MediaWikiリンクオブジェクト
                h2mwLinkMW = {
                    link: '', // [[]]の中身

                    toString: function () {
                        return '[[' + this.link + ']]';
                    },

                    isPiped: function () {
                        return (/\|/.test(this.link));
                    },
                    getPageName: function () {
                        var link,
                            pageName,
                            indPipe;

                        link = this.link;

                        indPipe = link.indexOf('|');
                        if (indPipe !== -1) {
                            pageName = link.slice(0, indPipe);
                        } else {
                            pageName = link;
                        }

                        // ページ名の先頭が“|”の場合は“|”を外す
                        //（MediaWikiの処理）
                        if (pageName.charAt(0) === '|') {
                            pageName = pageName.slice(1);
                        }

                        return pageName;
                    },
                    getLinkText: function () {
                        var link,
                            linkText,
                            indPipe;

                        link = this.link;

                        indPipe = link.indexOf('|');
                        if (indPipe !== -1) {
                            linkText = link.slice(indPipe + 1);
                        } else {
                            linkText = link;
                        }

                        return linkText;
                    }
                },
                newLinkMW = function (lineIndex, charIndex) {
                    var that = Object.create(h2mwLinkMW);

                    that.getLineIndex = function () {
                        return Number(lineIndex) + 1;
                    };
                    that.getCharIndex = function () {
                        return charIndex;
                    };

                    return that;
                },

                // WikiNameオブジェクト
                h2mwWikiName = {
                    pageName: '',

                    toString: function () {
                        return this.pageName;
                    }
                },
                newWikiName = function (lineIndex, charIndex) {
                    var that = Object.create(h2mwWikiName);

                    that.getLineIndex = function () {
                        return Number(lineIndex) + 1;
                    };
                    that.getCharIndex = function () {
                        return charIndex;
                    };

                    return that;
                };

            reLink = new RegExp(BRACKET_LINK_RE, 'g');

            aryPattern.push('(?:' + BRACKET_LINK_RE + ')');
            aryPattern.push('(?:' + URI_LINK_RE + ')');
            aryPattern.push('(?:' + WIKI_NAME_RE + ')');
            reWikiName = new RegExp(aryPattern.join('|'), 'g');

            return function (sourceMW) {
                var result = {},
                    line,
                    linksAlphabet = [],
                    linkAlphabet,
                    linksParenthesis = [],
                    linkParenthesis,
                    wikiNames = [],
                    wikiName,
                    aryLinkRE = [],
                    aryWikiNameRE = [],
                    link,
                    pageName,
                    lastChar,
                    i;

                lines = sourceMW.split('\n');
                lenLines = lines.length;

                for (i = 0; i < lenLines; i += 1) {
                    line = lines[i];
                    reLink.lastIndex = 0;
                    reWikiName.lastIndex = 0;

                    // リンク
                    while ((aryLinkRE = reLink.exec(line)) !== null) {
                        link = aryLinkRE[0].slice(2, -2);
                        pageName = h2mwLinkMW.getPageName.apply({link: link},
                            []);

                        // 英字名ページへのリンク
                        if (!/[^ -~]/.test(pageName)) {
                            // lastIndexは“]”の桁
                            // → lastIndex + 1 - (length + 4)
                            linkAlphabet = newLinkMW(i,
                                reLink.lastIndex - link.length - 3);
                            linkAlphabet.link = link;
                            linksAlphabet.push(linkAlphabet);
                        }

                        // 括弧を含む名前のページへのリンク
                        lastChar = pageName.charAt(pageName.length - 1);
                        if (lastChar === ')' || lastChar === '）') {
                            if (/[\(（]/.test(pageName)) {
                                // lastIndexは“]”の桁
                                // → lastIndex + 1 - (length + 4)
                                linkParenthesis = newLinkMW(i,
                                    reLink.lastIndex - link.length - 3);
                                linkParenthesis.link = link;
                                linksParenthesis.push(linkParenthesis);
                            }
                        }
                    }

                    // WikiName
                    while ((aryWikiNameRE = reWikiName.exec(line)) !== null) {
                        if (aryWikiNameRE[0].charAt(0) !== '[') {
                            pageName = aryWikiNameRE[0];
                            wikiName = newWikiName(i,
                                reWikiName.lastIndex + 1 - pageName.length);
                            wikiName.pageName = pageName;
                            wikiNames.push(wikiName);
                        }
                    }
                }

                result.linksAlphabet = linksAlphabet;
                result.linksParenthesis = linksParenthesis;
                result.wikiNames = wikiNames;
                return result;
            };
        }());

    // オブジェクトを返す
    return {
        convert: convert,
        analyzeLinks: analyzeLinks
    };
};
