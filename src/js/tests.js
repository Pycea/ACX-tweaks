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

function doTests() {
    console.log("Running tests");
    testCommentStyling();
}

// doTests();