/*
 * Hiki2MediaWiki for SRW Wiki
 * Converter of links to abbriviated SRW title
 * 2013-02-27 Ver. 2.2.0 made by ocha
 */

(function (global) {
    'use strict';

    var SRW_SERIES = {
        // 旧シリーズ
        "第2次": "第2次スーパーロボット大戦",
        "第2次G": "第2次スーパーロボット大戦G",
        "第3次": "第3次スーパーロボット大戦",
        "EX": "スーパーロボット大戦EX",
        "第4次": "第4次スーパーロボット大戦",
        "第4次S": "第4次スーパーロボット大戦S",
        "F": "スーパーロボット大戦F",
        "F完結編": "スーパーロボット大戦F完結編",
        "CB": "スーパーロボット大戦コンプリートボックス",

        // COMPACTシリーズ
        "COMPACT": "スーパーロボット大戦COMPACT",
        "COMPACT2": "スーパーロボット大戦COMPACT2",
        "IMPACT": "スーパーロボット大戦IMPACT",
        "COMPACT3": "スーパーロボット大戦COMPACT3",

        // αシリーズ
        "α": "スーパーロボット大戦α",
        "α外伝": "スーパーロボット大戦α外伝",
        "第2次α": "第2次スーパーロボット大戦α",
        "第3次α": "第3次スーパーロボット大戦α",

        // Zシリーズ
        "Z": "スーパーロボット大戦Z",
        "ZSPD": "スーパーロボット大戦Zスペシャルディスク",
        "第2次Z": "第2次スーパーロボット大戦Z",
        "破界篇": "第2次スーパーロボット大戦Z破界篇",
        "再世篇": "第2次スーパーロボット大戦Z再世篇",

        // 携帯機シリーズ
        "A": "スーパーロボット大戦A",
        "R": "スーパーロボット大戦R",
        "D": "スーパーロボット大戦D",
        "J": "スーパーロボット大戦J",
        "W": "スーパーロボット大戦W",
        "K": "スーパーロボット大戦K",
        "UX": "スーパーロボット大戦UX",

        // Scramble Commanderシリーズ
        "SC": "スーパーロボット大戦Scramble Commander",
        "SC2": "スーパーロボット大戦Scramble Commander the 2nd",

        // 単独作品
        "新": "新スーパーロボット大戦",
        "リンクバトラー": "スーパーロボット大戦リンクバトラー",
        "64": "スーパーロボット大戦64",
        "MX": "スーパーロボット大戦MX",
        "GC": "スーパーロボット大戦GC",
        "XO": "スーパーロボット大戦XO",
        "学園": "スパロボ学園",
        "NEO": "スーパーロボット大戦NEO",

        // OGシリーズ
        "OG": "OGシリーズ",
        "OG1": "スーパーロボット大戦ORIGINAL GENERATION",
        "OG2": "スーパーロボット大戦ORIGINAL GENERATION2",
        "ジ・インスペクター": "スーパーロボット大戦OG ジ・インスペクター",
        "OGs": "スーパーロボット大戦OG ORIGINAL GENERATIONS",
        "OGS": "スーパーロボット大戦OG ORIGINAL GENERATIONS",
        "OG外伝": "スーパーロボット大戦OG外伝",
        "第2次OG": "第2次スーパーロボット大戦OG",

        // 無限のフロンティアシリーズ
        "無限のフロンティア": "無限のフロンティア スーパーロボット大戦OGサーガ",
        "無限のフロンティアEXCEED": "無限のフロンティアEXCEED スーパーロボット大戦OGサーガ",

        // 魔装機神シリーズ
        "LOE": "スーパーロボット大戦外伝 魔装機神 THE LORD OF ELEMENTAL",
        "魔装機神I": "スーパーロボット大戦外伝 魔装機神 THE LORD OF ELEMENTAL",
        "ROE": "スーパーロボット大戦OGサーガ 魔装機神II REVELATION OF EVIL GOD",
        "魔装機神II": "スーパーロボット大戦OGサーガ 魔装機神II REVELATION OF EVIL GOD"
    };

    function getLinkREg(text) {
        return new RegExp('\\[\\[' + text + '\\]\\]', 'g');
    }

    function getLinkFormatHiki(linkText, pageName) {
        return '[[' + linkText + '|' + pageName + ']]';
    }

    function getLinkFormatMW(linkText, pageName) {
        return '[[' + pageName + '|' + linkText + ']]';
    }

    function convertAbbrSRWLinksHiki(source) {
        var abbr;

        for (abbr in SRW_SERIES) {
            if (SRW_SERIES.hasOwnProperty(abbr)) {
                source = source.replace(getLinkREg(abbr),
                    getLinkFormatHiki(abbr, SRW_SERIES[abbr]));
            }
        }

        return source;
    }

    function convertAbbrSRWLinksMW(source) {
        var abbr;

        for (abbr in SRW_SERIES) {
            if (SRW_SERIES.hasOwnProperty(abbr)) {
                source = source.replace(getLinkREg(abbr),
                    getLinkFormatMW(abbr, SRW_SERIES[abbr]));
            }
        }

        return source;
    }

    global.HIKI2MW.convertAbbrSRWLinksHiki = convertAbbrSRWLinksHiki;
    global.HIKI2MW.convertAbbrSRWLinksMW = convertAbbrSRWLinksMW;
}(this));
