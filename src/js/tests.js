// unit tests

let logTesting = false;

function assertEqual(expected, actual) {
    if (logTesting) {
        console.log(`expected "${expected}", got "${actual}`);
    }

    if (expected !== actual) {
        console.error(`expected "${expected}", got "${actual}"`);
        console.trace();
    }
}

function testCommentStyling() {
    function testItalics() {
        let testCases = {
            "*test*": "<i>test</i>",
            "**test**": "*<i>test</i>*",
            "*two* at *once*": "<i>two</i> at <i>once</i>",
            "******": "******",
            "**": "**",
            "*test many words*": "<i>test many words</i>",
            "(*test*)": "(<i>test</i>)",
            "[*test*]": "[<i>test</i>]",
            "{*test*}": "{<i>test</i>}",
            "This is 1*1 and 2*2": "This is 1*1 and 2*2",
            "A different equation is 3 * 3 and 4 * 4": "A different equation is 3 * 3 and 4 * 4",
            "*a*": "<i>a</i>",
            "*ab*": "<i>ab</i>",
            "*abc*": "<i>abc</i>",
            "Here *there are* *many* different *words*": "Here <i>there are</i> <i>many</i> different <i>words</i>",
            "How about some *punctuation*?": "How about some <i>punctuation</i>?",
        };

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = applyCommentStylingOption.processCommentParagraph(testCase);
            assertEqual(expected, actual);
        }

        for (let testCase in testCases) {
            let expected = testCases[testCase].replace(/\*/g, "_");
            let newTestCase = testCase.replace(/\*/g, "_");
            let actual = applyCommentStylingOption.processCommentParagraph(newTestCase);
            assertEqual(expected, actual);
        }
    }

    function testBlockquotes() {
        let testCases = {
            "> Basic case": "<blockquote>Basic case</blockquote>",
            ">No space": "<blockquote>No space</blockquote>",
            "Not a > case": "Not a > case",
            "&gt; Basic case": "<blockquote>Basic case</blockquote>",
            "&gt;No space": "<blockquote>No space</blockquote>",
            "&gt;   &gt;  Nested": "<blockquote><blockquote>Nested</blockquote></blockquote>",
            "Not a &gt; case": "Not a &gt; case",
        };

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = applyCommentStylingOption.processCommentParagraph(testCase);
            assertEqual(expected, actual);
        }
    }

    function testLink() {
        let testCases = {
            '[Basic link](<a href="test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">test.com</a>)':
                '<a href="test.com" target="_blank" rel="noreferrer noopener">Basic link</a>',
            'some text [Basic link](<a href="test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">test.com</a>) after':
                'some text <a href="test.com" target="_blank" rel="noreferrer noopener">Basic link</a> after',
            'two [links](<a href="test.com" class="linkified" target="_?">test.com</a>) at [once](<a href="example.com" class="linkified" target="_blank" >test.com</a>)':
                'two <a href="test.com" target="_blank" rel="noreferrer noopener">links</a> at <a href="example.com" target="_blank" rel="noreferrer noopener">once</a>',
            '[Full url](<a href="https://www.test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">https://www.test.com</a>)':
                '<a href="https://www.test.com" target="_blank" rel="noreferrer noopener">Full url</a>',
            '[Wî()rd ch[cter{}s&gt;](<a href="https://www.test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">https://www.test.com</a>)':
                '<a href="https://www.test.com" target="_blank" rel="noreferrer noopener">Wî()rd ch[cter{}s&gt;</a>',
            '(Bad format)[<a href="https://www.test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">test.com</a>]':
                '(Bad format)[<a href="https://www.test.com" class="linkified" target="_blank" rel="nofollow ugc noopener">test.com</a>]',
            '[just brackets]': '[just brackets]',
            '[just parens]': '[just parens]',
        };

        for (let testCase in testCases) {
            let expected = testCases[testCase];
            let actual = applyCommentStylingOption.processCommentParagraph(testCase);
            assertEqual(expected, actual);
        }
    }

    testItalics();
    testBlockquotes();
    testLink();
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
}

// doTests();