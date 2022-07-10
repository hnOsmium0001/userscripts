// ==UserScript==
// @name         irccloud formatting helper 2
// @namespace    http://github.com/hnOsmium0001
// @version      1.0
// @description  Utility to add formatting chars for IRCCloud
// @author       Steve Howard
// @author       hnOsmium0001
// @match        https://www.irccloud.com/*
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

/**
 * formatHelper: String -> String
 * Converts IRC control characters to HTML tags to preview formatting
 */
function formatForBrowser (str) {
    var controlCharRegex = /(\x1d|\x02|\x1e|\x1f)/g;
    var pieces = str.split(controlCharRegex);
    var output = [];

    var bold = false, italic = false, strikethrough = false, underline = false;

    for (var i = 0, end = pieces.length; i < end; ++i) {
        var piece = pieces[i];

        if (piece.match(/\x1d/)) {
            italic = !italic;
            output.push(italic ? '<i>' : '</i>');
        }
        else if (piece.match(/\x02/)) {
            bold = !bold;
            output.push(bold ? '<b>' : '</b>');
        }
        else if (piece.match(/\x1e/)) {
            strikethrough = !strikethrough;
            output.push(strikethrough ? '<del>' : '</del>');
        }
        else if (piece.match(/\x1f/)) {
            underline = !underline;
            output.push(underline ? '<u>' : '</u>');
        }
        else {
            output.push(piece);
        }
    }

    return output.join('');
}

/**
 * createOverlay: Node -> Node
 * Creates a div that copies the same
 */
function createOverlay (msg) {
    var o = document.createElement('div');
    o.style.width = msg.style.width;
    o.style.height = msg.style.height;
    o.style.whiteSpace = 'pre';

    o.addEventListener('click', function () {
        msg.focus();
    });

    msg.addEventListener('keyup', function () {
        // Can't just make this a global variable because RegExps store state
        var controlCharRegex = /(\x1d|\x02|\x1e|\x1f)/g;
        if (controlCharRegex.test(msg.value)) {
            // If there were control characters, use the overlay/side by side view to preview message
            // Easier to check the contents than inspect the state from the above; clears itself when necessary
            o.innerHTML = formatForBrowser(msg.value);
            o.style.display = 'block';
        }
        else {
            // otherwise the text box by itself is much faster
            o.style.display = 'none';
        }
    });

    return o;
}


function main (msg) {
    var overlay = createOverlay(msg);
    msg.parentNode.appendChild(overlay);

    function keyHandler (e) {
        function emitControlCharacter (c) {
            var st = msg.selectionStart, en = msg.selectionEnd;

            // check for text selection. If so, insert control character twice
            if (st < en) {
                var val = msg.value;
                msg.value = val.substring(0, st) + c + val.substring(st, en) + c + val.substring(en);
            }
            else {
                msg.value += c;
            }
        }

        if (e.ctrlKey) {
            switch (e.keyCode) {
                case 73: // 'i'
                    if (e.altKey) {
                        emitControlCharacter('\x1d');
                    }
                    break;

                case 66: // 'b'
                    if (e.altKey) {
                        emitControlCharacter('\x02');
                    }
                    break;

                case 85: // 'u'
                    if (e.altKey) {
                        emitControlCharacter('\x1f');
                    }
                    break;

                case 88: // 'x'
                    if (e.altKey) {
                        emitControlCharacter('\x1e');
                    }
                    break;
            }
        }
    }

    msg.addEventListener('keyup', keyHandler);
}

(function () {
    var initialized = {};

    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            Array.from(mutation.addedNodes).forEach(function (node) {
                var msg = node.querySelector && node.querySelector('[name=msg]');
                if (msg && !initialized[msg.id]) {
                    main(msg);
                    initialized[msg.id] = true;
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();