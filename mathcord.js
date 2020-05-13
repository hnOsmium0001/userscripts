// ==UserScript==
// @name         Mathcord Reborn
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Typeset equations in Discord messages.
// @author       Till Hoffmann, hnOsmium0001
// @license      MIT
// @match        https://discordapp.com/*
// @match        https://discord.com/*
// @resource     katexCSS https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.min.css
// @require      https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.min.js
// @require      https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/contrib/auto-render.min.js
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

/**
 * Evaluate whether an element has a certain class prefix.
 */
function hasClassPrefix(element, prefix) {
    var classes = (element.getAttribute("class") || "").split();
    return classes.some(x => x.startsWith(prefix));
}

(function() {
    'use strict';

    if (!renderMathInElement) throw "Katex did not load correctly!";

    // Declare rendering options (see https://katex.org/docs/autorender.html#api for details)
    const options = {
        delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "\\(", right: "\\)", display: false},
            {left: "\\[", right: "\\]", display: true},
            // Needs to come last to prevent over-eager matching of delimiters
            {left: "$", right: "$", display: false},
        ],
    };

    // We need to download the CSS, modify any relative urls to be absolute, and inject the CSS
    let katexCSS = GM_getResourceText("katexCSS");
    let pattern = /url\((.*?)\)/gi;
    katexCSS = katexCSS.replace(pattern, 'url(https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/$1)');
    GM_addStyle(katexCSS);

    class ChildrenSelector {
        constructor(elm) {
            this.elm = elm;
        }

        andThenTag(tag, alternativeElm) {
            if (!this.elm) {
                this.elm = alternativeElm;
                return this;
            }

            for (const child of this.elm.childNodes) {
                if (child.tagName === tag) {
                    this.elm = child;
                    return this;
                }
            }
            this.elm = alternativeElm;
            return this;
        }

        andThenClass(prefix, alternativeElm) {
            if (!this.elm) {
                this.elm = alternativeElm;
                return this;
            }

            for (const child of this.elm.childNodes) {
                if (hasClassPrefix(child, prefix)) {
                    this.elm = child;
                    return this;
                }
            }
            // Failed to find a matching children
            this.elm = alternativeElm;
            return this;
        }

        accept(successful, failed) {
            if (this.elm) {
                successful(this.elm);
            } else {
                failed();
            }
        }
    }

    // Monitor the document for changes and render math as necessary
    var observer = new MutationObserver(function(mutations, observer) {
        for (const mutation of mutations) {
            const target = mutation.target;
            // Respond to newly loaded messages
            if (target.tagName === "DIV" && hasClassPrefix(target, "scroller")) {
                // Iterate over all messages added to the scroller and typeset them
                for (const added of mutation.addedNodes) {
                    if (added.tagName === "DIV" && hasClassPrefix(added, "message")) {
                        renderMathInElement(added, options);
                    }
                }
            }
            // Respond to edited messages
            else if (target.tagName === "DIV" && hasClassPrefix(target, "contents") &&
                       hasClassPrefix(target.parentNode, "message")) {
                for (const added of mutation.addedNodes) {
                    // Do not typeset the interactive edit container
                    if (added.tagName === "DIV" && !added.getAttribute("class")) {
                        continue;
                    }
                    // Hack to get around Discord's slight delay between confirm edit and edit displayed
                    setTimeout(_ => renderMathInElement(added, options), 1000);
                }
            }
            /*// Hack to respond to loading cached messages. These mutations are only triggered when the user mouse hovers over them
            else if (target.tagName === "DIV" && hasClassPrefix(target, "message")) {
                renderMathInElement(target, options);
            }*/
            // Respond to reloading cached messages
            else if (target.tagName === "DIV" && hasClassPrefix(target, "content")) {
                for (const added of mutation.addedNodes) {
                    if (!hasClassPrefix(added, "chat")) continue;
                    //renderMathInElement(added, options);
                    // We expect this element to be a "chat-xxxxx" one
                    new ChildrenSelector(added)
                        .andThenClass("content")
                        .andThenTag("MAIN")
                        .andThenClass("messagesWrapper")
                        .andThenClass("scrollerWrap")
                        .andThenClass("scroller")
                        .andThenClass("scrollerInner")
                        .accept(
                            scroller => {
                                for (const candidate of scroller.children) {
                                    if (candidate.tagName === "DIV" && hasClassPrefix(candidate, "message")) {
                                        renderMathInElement(candidate, options);
                                    }
                                }
                            },
                            () => {
                                throw "Failed to find 'scrollerInner' element on content change (reloading cached meesages)";
                            }
                        )
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
