/*
 * Hiki2MediaWiki for SRW Wiki
 * Common settings
 * 2013-02-27 made by ocha
 */

/*global $ */

// ページロード時
$(function () {
    'use strict';

    var $anchors = $("a[href^='#']"),
        $doc = $($.browser.safari ? 'body' : 'html');

    // スムーズスクロール
    $anchors.each(function () {
        var $anchor = $(this),
            anchorID = $anchor.attr('href'),
            $target = $(anchorID);

        $anchor.click(function () {
            var lenFixed = $('header').css('position') === 'fixed' ? -48 : 0,
                targetPositionTop = $target.offset().top + lenFixed;

            $doc.stop().animate({scrollTop: targetPositionTop}, {duration: 400});

            return false;
        });
    });
});
