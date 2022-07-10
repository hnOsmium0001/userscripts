// ==UserScript==
// @name         irccloud formatting helper 2
// @namespace    http://github.com/hnOsmium0001
// @version      2.0
// @description  Utility to add formatting chars for IRCCloud
// @author       Steve Howard
// @author       hnOsmium0001
// @match        https://www.irccloud.com/*
// @grant        none
// ==/UserScript==

/* jshint -W097 */
'use strict';

/**
 * Parse a string formatted in (a subset of) Markdown and return a string with HTML format tags.
 * @param {string} str 
 * @param {(type: 'bold' | 'italic' | 'underline' | 'strikethrough', transition: boolean) => string} formattingMapper
 * @returns {string}
 */
// TODO this currently allows mixing italics formatter '*text_'
function doFormat(str, formattingMapper) {
    let bold = false;
    let italic = false;
    let strikethrough = false;
    let underline = false;

    // An array of strings, which may contain text directly 'test' or formatting tags '<b>', '</b>', etc.
    let resultPieces = [];

    let anchor = 0; // Range begin
    let cursor = 0; // Range end

    /**
     * @param {number} advance 
     */
    function pushTextChunk(advance) {
        const length = cursor - anchor;
        if (length > 0) {
            resultPieces.push(str.substring(anchor, cursor));
        }

        anchor = cursor + advance;
        // This is taken care of at the end of loop body
        /* cursor += advance */
    }

    // We don't need to handle surrogate pairs, as long as we transparently keep them intact after the transformation
    while (cursor < str.length) {
        // The number after 'c' represents the number of lookahead characters
        let c0 = str[cursor + 0];
        let c1 = (cursor < (str.length - 1)) ? str[cursor + 1] : '\0';

        // Number of characters we advanced this pass
        let advance;
        let matchedControl = false;

        if (c0 == '*') {
            if (c1 == '*') {
                // **text**
                bold = !bold;

                advance = 2;
                matchedControl = true;

                pushTextChunk(advance);
                resultPieces.push(formattingMapper('bold', bold));
            } else {
                // *text*
                italic = !italic;

                advance = 1;
                matchedControl = true;

                pushTextChunk(advance);
                resultPieces.push(formattingMapper('italic', italic));
            }
        } else if (c0 == '_') {
            if (c1 == '_') {
                // __text__
                underline = !underline;

                advance = 2;
                matchedControl = true;

                pushTextChunk(advance);
                resultPieces.push(formattingMapper('underline', underline));
            } else {
                // _text_
                italic = !italic;

                advance = 1;
                matchedControl = true;

                pushTextChunk(advance);
                resultPieces.push(formattingMapper('italic', italic));
            }
        } else if (c0 == '~' && c1 == '~') {
            // ~~text~~
            strikethrough = !strikethrough;

            advance = 2;
            matchedControl = true;

            pushTextChunk(advance);
            resultPieces.push(formattingMapper('strikethrough', strikethrough));
        } else {
            // We didn't match anything
            advance = 1;
            matchedControl = false;
        }

        cursor += advance;
    }

    // Push everything else, if there is any
    cursor = str.length;
    pushTextChunk(0);

    return resultPieces.join('');
}

const browserFormattingMap = {
    'bold': { 'true': '<b>', 'false': '</b>' },
    'italic': { 'true': '<i>', 'false': '</i>' },
    'underline': { 'true': '<u>', 'false': '</u>' },
    'strikethrough': { 'true': '<del>', 'false': '</del>' },
};

/**
 * @param {string} str 
 * @returns {string}
 */
function formatMarkdownForBrowser(str) {
    return doFormat(str, (type, transition) => browserFormattingMap[type][transition]);
}

const ircFormattingMap = {
    'bold': { 'true': '\x02', 'false': '\x02' },
    'italic': { 'true': '\x1d', 'false': '\x1d' },
    'underline': { 'true': '\x1f', 'false': '\x1f' },
    'strikethrough': { 'true': '\x1e', 'false': '\x1e' },
};

/**
 * @param {string} str 
 * @returns {string}
 */
function formatIrcControlCodes(str) {
    return doFormat(str, (type, transition) => ircFormattingMap[type][transition]);
}

/**
 * @param {Node} msg
 * @returns {Node}
 */
function createMessagePreview(msg) {
    const o = document.createElement('div');
    // o.style.width = msg.style.width;
    // o.style.height = msg.style.height;
    o.style.whiteSpace = 'pre';
    return o;
}

function bindTextarea() {
    if (cb() == null) {
        return;
    }

    // Maintained by IRCCloud, a separate one per buffer
    const inputBox = document.getElementById(`bufferInputView${cb().bid()}`);

    if (!inputBox.dataset.formattingHelperRegistered) {
        inputBox.dataset.formattingHelperRegistered = true;

        const previewBox = createMessagePreview();
        inputBox.parentElement.insertBefore(previewBox, inputBox.nextSibling);    

        inputBox.addEventListener('input', () => {
            const msg = inputBox.value;
            const formattedMsg = formatMarkdownForBrowser(msg);
            previewBox.innerHTML = formattedMsg;
        }, false);

        inputBox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const msg = inputBox.value;
                const formattedMsg = formatIrcControlCodes(msg);
                inputBox.value = formattedMsg;
                previewBox.innerHTML = '';
            }
        });
    }
}

function init() {
}

(function checkSession() {
    // Taken from https://github.com/dogancelik/irccloud-sws/blob/6836cac008/src/send_with_style.user.js#L394-L406
    if (window.hasOwnProperty('SESSION')) {
        window.SESSION.bind('init', () => {
            init();

            // For the initially open channel
            bindTextarea();

            // For switching channels later (channel == "buffer")
            window.SESSION.buffers.on('doneSelected', () => {
                bindTextarea();
            });
        });
    } else {
        setTimeout(checkSession, 100);
    }
})();
