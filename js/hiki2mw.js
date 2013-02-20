/*
 * Hiki2MediaWiki for SRW Wiki
 * 2012-08-16 Ver. 2.0.4 made by ocha
 */

/*jslint browser: true */
/*global $, hiki2MW */

// ページロード時
$(function () {
    'use strict';

// プロトタイプ拡張
// [関数]
    // メソッドの追加
    Function.prototype.method = function (name, func) {
        if (!this.prototype[name]) {
            this.prototype[name] = func;
            return this;
        }
    };

// [文字列]
    //“<”、“>”、“&”の実体参照化
    String.method('entityify', function () {
        return this.replace(/&/g, '&amp;').replace(/</g,
            '&lt;').replace(/>/g, '&gt;');
    });

// イベント処理

    var converter = hiki2MW(),

        $anchors,
        $doc,

        multistep,

        resetElements,

        displayConverting,
        restoreDisplay,
        convert,
        analyzeLinks,
        sourceMW = '',

        cookieSelectOnFocus,
        cookieAnalyzeLinks,

        select_taMW;

    // スムーズスクロール
    $anchors = $("a[href^='#']");
    $doc = $($.browser.safari ? 'body' : 'html');

    $anchors.each(function () {
        var $anchor = $(this),
            anchorID = $anchor.attr('href'),
            $target = $(anchorID);

        $anchor.click(function () {
            var targetPositionTop = $target.offset().top - 48;

            $doc.stop().animate({scrollTop: targetPositionTop}, {duration: 400});

            return false;
        });
    });

    multistep = function (steps, args, callback) {
        var tasks = steps.concat(), //元の配列のクローンを作成
            doTask = function () {
                // 次のタスクを実行する
                var task = tasks.shift();
                task.apply(null, args || []);

                // まだタスクがあるかを調べる
                if (tasks.length > 0) {
                    setTimeout(doTask, 25);
                } else {
                    callback();
                }
            };
        setTimeout(doTask, 25);
    };

    resetElements = function () {
        sourceMW = '';
        document.getElementById('taMW').value = '';

        $('section#MediaWiki div').hide()
            .children().not('h3').remove();
    };

    displayConverting = function () {
        $('body, textarea, button, ' +
                'a, label, input[type="checkbox"]')
            .css('cursor', 'wait');
        document.getElementById('btnConvert').disabled = true;
        document.getElementById('btnReset').disabled = true;
        $('#btnConvert .text').text('変換中');
        resetElements();
    };

    restoreDisplay = function () {
        document.getElementById('btnConvert').disabled = false;
        document.getElementById('btnReset').disabled = false;
        $('#btnConvert .text').text('変換');
        $('body').css('cursor', 'auto');
        $('textarea').css('cursor', 'text');
        $('button, a, label, input[type="checkbox"]')
            .css('cursor', 'pointer');
    };

    convert = function () {
        var sourceHiki = document.getElementById('taHiki').value;
        sourceMW = converter.convert(sourceHiki);
        document.getElementById('taMW').value = sourceMW;
    };

    analyzeLinks = (function () {
        var get$linkMW = function (linkMW, opt_setLink) {
            var $linkMW,
                setLink = Boolean(opt_setLink),
                href,
                htmlLinkText;

            href = 'http://hiki.cre.jp/SRW/?' +
                encodeURIComponent(linkMW.getPageName());

            if (linkMW.isPiped()) {
                htmlLinkText = '[[<strong>' +
                    linkMW.getPageName().entityify() +
                    '</strong>|' +
                    linkMW.getLinkText().entityify() +
                    ']]';
                if (setLink) {
                    $linkMW = $('<a>', {href: href, html: htmlLinkText});
                } else {
                    $linkMW = htmlLinkText;
                }
            } else {
                if (setLink) {
                    $linkMW = $('<a>', {href: href, text: linkMW.toString()});
                } else {
                    $linkMW = linkMW.toString().entityify();
                }
            }

            return $linkMW;
        };

        return function () {
            var result,
                $table,
                $tbody,
                $tr,
                len,
                linkAlphabet,
                linkParenthesis,
                wikiName,
                hrefWikiName,
                i;

            result = converter.analyzeLinks(sourceMW);

            // 英字名ページへのリンクの一覧表示
            len = result.linksAlphabet.length;
            if (len > 0) {
                $table = $('<table>', {
                    summary: '英字名ページへのリンクの一覧'
                });
                $table.addClass('table table-striped table-condensed table-bordered')
                    .append('<thead>' +
                        '<tr><th>#</th><th>行</th><th>桁</th><th>リンク</th></tr>' +
                        '</thead>');
                $tbody = $('<tbody>').appendTo($table);

                for (i = 0; i < len; i += 1) {
                    linkAlphabet = result.linksAlphabet[i];
                    $tr = $('<tr>');

                    // 番号
                    $('<td>', {text: i + 1})
                        .addClass('number')
                        .appendTo($tr);
                    // 行
                    $('<td>', {text: linkAlphabet.getLineIndex()})
                        .addClass('number')
                        .appendTo($tr);
                    // 桁
                    $('<td>', {text: linkAlphabet.getCharIndex()})
                        .addClass('number')
                        .appendTo($tr);
                    // リンク
                    $('<td>')
                        .append(get$linkMW(linkAlphabet, true))
                        .appendTo($tr);

                    $tbody.append($tr);
                }

                $('#links-alphabet').append($table);

                $('#links-alphabet').show();
            }

            // WikiNameの一覧表示
            len = result.wikiNames.length;
            if (len > 0) {
                $table = $('<table>', {
                    summary: 'WikiNameの一覧'
                });
                $table.addClass('table table-striped table-condensed table-bordered')
                    .append('<thead>' +
                        '<tr><th>#</th><th>行</th><th>桁</th><th>WikiName</th></tr>' +
                        '</thead>');
                $tbody = $('<tbody>').appendTo($table);

                for (i = 0; i < len; i += 1) {
                    wikiName = result.wikiNames[i];
                    $tr = $('<tr>');

                    // 番号
                    $('<td>', {text: i + 1})
                        .addClass('number')
                        .appendTo($tr);
                    // 行
                    $('<td>', {text: wikiName.getLineIndex()})
                        .addClass('number')
                        .appendTo($tr);
                    // 桁
                    $('<td>', {text: wikiName.getCharIndex()})
                        .addClass('number')
                        .appendTo($tr);
                    // WikiName
                    hrefWikiName = 'http://hiki.cre.jp/SRW/?' +
                        encodeURIComponent(wikiName.pageName);
                    $('<td>').append($('<a>',
                        {href: hrefWikiName, text: wikiName.pageName}))
                        .appendTo($tr);

                    $tbody.append($tr);
                }

                $('#WikiNames').append($table);

                $('#WikiNames').show();
            }

            // 括弧を含む名前のページへのリンクの一覧表示
            len = result.linksParenthesis.length;
            if (len > 0) {
                $table = $('<table>', {
                    summary: '括弧を含む名前のページへのリンク'
                });
                $table.addClass('table table-striped table-condensed table-bordered')
                    .append('<thead>' +
                        '<tr><th>#</th><th>行</th><th>桁</th><th>リンク</th></tr>' +
                        '</thead>');
                $tbody = $('<tbody>').appendTo($table);

                for (i = 0; i < len; i += 1) {
                    linkParenthesis = result.linksParenthesis[i];
                    $tr = $('<tr>');

                    // 番号
                    $('<td>', {text: i + 1})
                        .addClass('number')
                        .appendTo($tr);
                    // 行
                    $('<td>', {text: linkParenthesis.getLineIndex()})
                        .addClass('number')
                        .appendTo($tr);
                    // 桁
                    $('<td>', {text: linkParenthesis.getCharIndex()})
                        .addClass('number')
                        .appendTo($tr);
                    // リンク
                    $('<td>')
                        .append(get$linkMW(linkParenthesis))
                        .appendTo($tr);

                    $tbody.append($tr);
                }

                $('#links-parenthesis').append($table);

                $('#links-parenthesis').show();
            }
        };
    }());

    // 変換ボタンクリック時
    $('#btnConvert').click(function () {
        if (document.getElementById('taHiki').value === '') {
            return false;
        }

        var steps = [displayConverting, convert];
        if (document.getElementById('ckbAnalyzeLinks').checked) {
            steps.push(analyzeLinks);
        }

        multistep(steps, [], restoreDisplay);
    });

    // リセット時
    document.frmHiki2MW.onreset = function () {
        resetElements();
        document.getElementById('taHiki').value = '';
        return false;
    };

    // Cookie
    cookieSelectOnFocus = $.cookie('selectOnFocus');
    cookieAnalyzeLinks = $.cookie('analyzeLinks');
    // デフォルト値の設定
    if (cookieAnalyzeLinks === null) {
        cookieAnalyzeLinks = true;
    }

    document.getElementById('ckbSelectOnFocus').checked = Number(cookieSelectOnFocus);
    document.getElementById('ckbAnalyzeLinks').checked = Number(cookieAnalyzeLinks);

    // チェックボックスのクリック時に、有効期限7日間でcookieへ設定を保存する
    $('#ckbSelectOnFocus').click(function () {
        $.cookie('selectOnFocus',
            Number(document.getElementById('ckbSelectOnFocus').checked),
            {expires: 7});
    });
    $('#ckbAnalyzeLinks').click(function () {
        $.cookie('analyzeLinks',
            Number(document.getElementById('ckbAnalyzeLinks').checked),
            {expires: 7});
    });

    // taMWをフォーカス時に全選択状態にする
    select_taMW = function () {
        document.getElementById('taMW').select();
    };

    $('#taMW').focus(function () {
        if (document.getElementById('ckbSelectOnFocus').checked) {
            // 100 ms遅らせ、ブラウザの処理との衝突を回避
            setTimeout(select_taMW, 100);
        }
    });
});
