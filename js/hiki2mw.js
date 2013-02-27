/*
 * Hiki2MediaWiki for SRW Wiki
 * Controller Module
 * 2013-02-27 made by ocha
 */

/*jslint browser: true */
/*global $, HIKI2MW */

// ページロード時
$(function () {
    'use strict';

// プロトタイプ拡張
// [関数]
    // メソッドの追加
    Function.prototype.method = function method(name, func) {
        if (!this.prototype[name]) {
            this.prototype[name] = func;
            return this;
        }
    };

// [文字列]
    //“<”、“>”、“&”の実体参照化
    String.method('entityify', function entityify() {
        return this.replace(/&/g, '&amp;').replace(/</g,
            '&lt;').replace(/>/g, '&gt;');
    });

// イベント処理

    var frmHiki2MW = document.getElementById('frmHiki2MW'),
        $taHiki = $('#taHiki'),
        $taMW = $('#taMW'),
        $btnConvert = $('#btnConvert'),
        $btnConvertText = $('#btnConvert span.text'),
        $btnReset = $('#btnReset'),
        $ckbSelectOnFocus = $('#ckbSelectOnFocus'),
        $ckbAnalyzeLinks = $('#ckbAnalyzeLinks'),
        $ckbConvertAbbrSRWLinks = $('#ckbConvertAbbrSRWLinks'),

        elements,
        lenElements,
        cursors,
        cursorTAEnabled = window.getComputedStyle($taHiki[0]).cursor,
        cursorTADisabled = window.getComputedStyle($taMW[0]).cursor,

        analyzeLinks,
        sourceMW = '',

        cookieSelectOnFocus,
        cookieAnalyzeLinks,
        cookieConvertAbbrSRWLinks;

    function multistep(steps, args, callback) {
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
    }

    function resetElements() {
        sourceMW = '';
        $taMW[0].disabled = true;
        $taMW.val('').css('cursor', cursorTADisabled);

        $('section#MediaWiki div').hide()
            .children().not('h3').remove();
    }

    function displayConverting() {
        var i;

        elements = Array.prototype.slice.apply(
            document.getElementsByTagName('*'), []);
        lenElements = elements.length;

        cursors = [];
        for (i = 0; i < lenElements; i += 1) {
            cursors.push(window.getComputedStyle(elements[i]).cursor);
        }

        $('*').css('cursor', 'wait');

        $btnConvert[0].disabled = true;
        $btnReset[0].disabled = true;
        $btnConvertText.text('変換中');
        resetElements();
    }

    function restoreDisplay() {
        var i;

        $taMW[0].disabled = false;
        $btnConvert[0].disabled = false;
        $btnReset[0].disabled = false;
        $btnConvertText.text('変換');

        for (i = 0; i < lenElements; i += 1) {
            elements[i].style.cursor = cursors[i];
        }
        $taMW.css('cursor', cursorTAEnabled);
    }

    function convert() {
        var sourceHiki = $taHiki.val();
        sourceMW = HIKI2MW.convert(sourceHiki);
        $taMW.val(sourceMW);
    }

    function convertAbbrSRWLinks() {
        sourceMW = HIKI2MW.convertAbbrSRWLinksMW(sourceMW);
        $taMW.val(sourceMW);
    }

    analyzeLinks = (function () {
        var URI_OLD_WIKI = 'http://hiki.cre.jp/SRW/?',

            get$linkMW = function (linkMW, opt_setLink) {
                var $linkMW,
                    setLink = Boolean(opt_setLink),
                    href,
                    htmlLinkText;

                href = URI_OLD_WIKI + encodeURIComponent(linkMW.getPageName());

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

        return function analyzeLinks() {
            var result,

                $table,
                $tbody,
                $tr,

                linkAlphabet,
                linkParenthesis,
                wikiName,
                hrefWikiName,

                len,

                i;

            result = HIKI2MW.analyzeLinks(sourceMW);

            // 英字名ページへのリンクの一覧表示
            len = result.linksAlphabet.length;
            if (len) {
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
                    $('<td>', {text: linkAlphabet.getLineNumber()})
                        .addClass('number')
                        .appendTo($tr);
                    // 桁
                    $('<td>', {text: linkAlphabet.getCharNumber()})
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
            if (len) {
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
                    $('<td>', {text: wikiName.getLineNumber()})
                        .addClass('number')
                        .appendTo($tr);
                    // 桁
                    $('<td>', {text: wikiName.getCharNumber()})
                        .addClass('number')
                        .appendTo($tr);
                    // WikiName
                    hrefWikiName = URI_OLD_WIKI +
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
            if (len) {
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
                    $('<td>', {text: linkParenthesis.getLineNumber()})
                        .addClass('number')
                        .appendTo($tr);
                    // 桁
                    $('<td>', {text: linkParenthesis.getCharNumber()})
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
    $btnConvert.click(function btnConvertOnClick() {
        if ($taHiki.val() === '') {
            return false;
        }

        var steps = [displayConverting, convert];
        if ($ckbConvertAbbrSRWLinks[0].checked) {
            steps.push(convertAbbrSRWLinks);
        }
        if (document.getElementById('ckbAnalyzeLinks').checked) {
            steps.push(analyzeLinks);
        }

        multistep(steps, [], restoreDisplay);
    });

    // リセット時
    frmHiki2MW.onreset = function frmHiki2MWOnReset() {
        resetElements();
        $taHiki.val('');
        return false;
    };

    // Cookie
    cookieSelectOnFocus = $.cookie('selectOnFocus');
    cookieAnalyzeLinks = $.cookie('analyzeLinks');
    cookieConvertAbbrSRWLinks = $.cookie('convertAbbrSRWLinks');
    // デフォルト値の設定
    if (cookieAnalyzeLinks === null) {
        cookieAnalyzeLinks = true;
    }
    if (cookieConvertAbbrSRWLinks === null) {
        cookieConvertAbbrSRWLinks = true;
    }

    $ckbSelectOnFocus[0].checked = Number(cookieSelectOnFocus);
    $ckbAnalyzeLinks[0].checked = Number(cookieAnalyzeLinks);
    $ckbConvertAbbrSRWLinks[0].checked = Number(cookieConvertAbbrSRWLinks);

    // チェックボックスのクリック時に、有効期限7日間でcookieへ設定を保存する
    $ckbSelectOnFocus.click(function () {
        $.cookie('selectOnFocus',
            Number($ckbSelectOnFocus[0].checked),
            {expires: 7});
    });
    $ckbAnalyzeLinks.click(function () {
        $.cookie('analyzeLinks',
            Number($ckbAnalyzeLinks[0].checked),
            {expires: 7});
    });
    $ckbConvertAbbrSRWLinks.click(function () {
        $.cookie('convertAbbrSRWLinks',
            Number($ckbConvertAbbrSRWLinks[0].checked),
            {expries: 7});
    });

    // taMWをフォーカス時に全選択状態にする
    function select_taMW() {
        $taMW[0].select();
    }

    $('#taMW').focus(function () {
        if ($ckbSelectOnFocus[0].checked) {
            // 100 ms遅らせ、ブラウザの処理との衝突を回避
            setTimeout(select_taMW, 100);
        }
    });
});
