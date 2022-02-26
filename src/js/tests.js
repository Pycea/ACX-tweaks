"use strict";

// unit tests

let logTesting = false;
let tests = 0;
let errors = 0;

function assertEqual(expected, actual) {
    if (logTesting) {
        console.log(`expected "${expected}", got "${actual}`);
    }

    if (expected !== actual) {
        console.error(`expected "${expected}", got "${actual}"`);
        console.trace();
        errors++;
    }

    tests++;
}

function testCommentStyling() {
    function testItalics() {
        let testCases = {
            "*test*": "<em>test</em>",
            "**test**": "*<em>test</em>*",
            "*two* at *once*": "<em>two</em> at <em>once</em>",
            "******": "******",
            "**": "**",
            "*test many words*": "<em>test many words</em>",
            "(*test*)": "(<em>test</em>)",
            "[*test*]": "[<em>test</em>]",
            "{*test*}": "{<em>test</em>}",
            "This is 1*1 and 2*2": "This is 1*1 and 2*2",
            "A different equation is 3 * 3 and 4 * 4": "A different equation is 3 * 3 and 4 * 4",
            "*a*": "<em>a</em>",
            "*ab*": "<em>ab</em>",
            "*abc*": "<em>abc</em>",
            "Here *there are* *many* different *words*": "Here <em>there are</em> <em>many</em> different <em>words</em>",
            "How about some *punctuation*?": "How about some <em>punctuation</em>?",
            "*Special &gt; chars*": "<em>Special &gt; chars</em>",
        };

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = applyCommentStylingOption.processCommentParagraph(testCase).innerHTML;
            assertEqual(expected, actual);
        }

        for (let testCase in testCases) {
            let expected = testCases[testCase].replace(/\*/g, "_");
            let newTestCase = testCase.replace(/\*/g, "_");
            let actual = applyCommentStylingOption.processCommentParagraph(newTestCase).innerHTML;
            assertEqual(expected, actual);
        }
    }

    function testBlockquotes() {
        let testCases = {
            "> Basic case": "<blockquote>Basic case</blockquote>",
            ">No space": "<blockquote>No space</blockquote>",
            "Not a > case": "Not a &gt; case",
            "&gt; Basic case": "<blockquote>Basic case</blockquote>",
            "&gt;No space": "<blockquote>No space</blockquote>",
            "&gt;   &gt;  Nested": "<blockquote><blockquote>Nested</blockquote></blockquote>",
            "Not a &gt; case": "Not a &gt; case",
        };

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = applyCommentStylingOption.processCommentParagraph(testCase).innerHTML;
            assertEqual(expected, actual);
        }
    }

    function testLink() {
        let attrs = 'class="linkified" target="_blank" rel="nofollow ugc noreferrer"';
        let testCases = {
            [`[Basic link](<a href="test.com" ${attrs}>test.com</a>)`]: `<a href="test.com" ${attrs}>Basic link</a>`,
            [`some text [Basic link](<a href="test.com" ${attrs}>test.com</a>) after`]:
                `some text <a href="test.com" ${attrs}>Basic link</a> after`,
            [`two [links](<a href="test.com" class="linkified" target="_?">test.com</a>) at [once](<a href="example.com" ${attrs} >test.com</a>)`]:
                `two <a href="test.com" ${attrs}>links</a> at <a href="example.com" ${attrs}>once</a>`,
            [`[Full url](<a href="https://www.test.com" ${attrs}>https://www.test.com</a>)`]:
                `<a href="https://www.test.com" ${attrs}>Full url</a>`,
            [`[Wî()rd ch[cter{}s&gt;](<a href="https://www.test.com" ${attrs}>https://www.test.com</a>)`]:
                `<a href="https://www.test.com" ${attrs}>Wî()rd ch[cter{}s&gt;</a>`,
            [`(Bad format)[<a href="https://www.test.com" ${attrs}>test.com</a>]`]:
                `(Bad format)[<a href="https://www.test.com" ${attrs}>test.com</a>]`,
            "[just brackets]": "[just brackets]",
            "[just parens]": "[just parens]",
        };

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = applyCommentStylingOption.processCommentParagraph(testCase).innerHTML;
            assertEqual(expected, actual);
        }
    }

    function testCombined() {
        let attrs = 'class="linkified" target="_blank" rel="nofollow ugc noreferrer"';
        let testCases = {
            "&gt; quote *star*": "<blockquote>quote <em>star</em></blockquote>",
            "*quote* &gt; *star*": "<em>quote</em> &gt; <em>star</em>",
            // "_nested *types*_": "<em>nested *types*</em>",
            // "*this *breaks* stuff*": "<em>this *breaks</em> stuff*",
            "_first one_ then *the other*": "<em>first one</em> then <em>the other</em>",
            "_&gt; stuff_": "<em>&gt; stuff</em>",
            [`[link *star*](<a href="test.com" ${attrs}>test.com</a>)`]:
                `<a href="test.com" ${attrs}>link *star*</a>`,
            [`&gt; <a href="test.com" ${attrs}>test.com</a>`]:
                `<blockquote><a href="test.com" ${attrs}>test.com</a></blockquote>`,
            // `*a link <a href="test.com" ${attrs}>test.com</a> star*`:
            //     `*a link <a href="test.com" ${attrs}>test.com</a> star*`,
            [`&gt;&gt; *all* of these [_links_](<a href="test.com" ${attrs}>test.com</a>) _here_`]:
                `<blockquote><blockquote><em>all</em> of these <a href="test.com" ${attrs}>_links_</a> <em>here</em></blockquote></blockquote>`,
        }

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = applyCommentStylingOption.processCommentParagraph(testCase).innerHTML;
            assertEqual(expected, actual);
        }
    }

    testItalics();
    testBlockquotes();
    testLink();
    testCombined();
}

function testVersionValidate() {
    let testCases = {
        "5": true,
        "1.2": true,
        "9.8.7": true,
        "3.1.4.5.9": true,
        "10.0": true,
        "0.16": true,
        "0": true,
        "0.0.0": true,
        "123.0.3213213": true,
        "02.1.4": true,
        "3.01": true,
        "3.00": true,
        "": false,
        ".1": false,
        "5.": false,
        "4.5.8.": false,
        ".1.2": false,
        "4.2..3": false,
        ".": false,
        undefined: false,
    }

    for (let testCase in testCases) {
        let expected = testCases[testCase];
        let actual = validateVersion(testCase);
        assertEqual(expected, actual);
    }
}

function testVersonCompare() {
    let testCases = [
        ["1", "1", 0],
        ["2.1", "2.1", 0],
        ["3.1.4", "3.1.4", 0],
        ["2", "1", 1],
        ["4.2", "4.1", 1],
        ["2.1.6", "2.1.3", 1],
        ["8", "9", -1],
        ["0.3", "0.4", -1],
        ["3.5.1", "3.5.2", -1],
        ["3.10.1", "3.9.2", 1],
        ["10.5.1", "9.6.2", 1],
        ["3.5.9", "3.5.10", -1],
        ["2.1", "2", 1],
        ["3", "3.1", -1],
        ["5", "4.5", 1],
        ["0.0.0", "0.0.1", -1],
        ["2.02.1", "2.2.1", 0],
        ["1.3.6", "1.4.6", -1],
        ["3.1.4", "2.1.4", 1],
        ["4", "4.0", -1],
        [undefined, undefined, 0],
        [undefined, "0", -1],
        ["0", undefined, 1],
    ];

    for (let testCase of testCases) {
        let expected = testCase[2];
        let actual = compareVersion(testCase[0], testCase[1]);
        assertEqual(expected, actual);
    }
}

function doTests() {
    console.log("Running tests");
    testCommentStyling();
    testVersionValidate();
    testVersonCompare();

    console.log(`${tests} tests run`);
    console.log(`${errors} errors found`);
}

// doTests();