// ==UserScript==
// @name         Tieba imgsa -> imgsrc
// @version      1.0
// @description  Convert image links in TieBa post in the form of "imgsa" to "imgsrc", which is uncompressed.
// @author       hnOsmium0001
// @match        *://tieba.baidu.com/*
// @run-at       document-loaded
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function toSourceLink(sa) {
        const start = sa.lastIndexOf('/') + 1;
        const end = sa.length;
        return location.protocol + '//imgsrc.baidu.com/forum/pic/item/' + sa.substring(start, end);
    }

    function processPost(images) {
        for(const image of images) {
            if(image.classList.contains("BDE_Image")) {
                image.src = toSourceLink(image.src);
            }
        }
    }

    // close classList (DOMTokenList) into every constructed (inner) lambda
    // which could be used for Array.prototype.some or Array.prototype.every
    const classPredicate = classList => clazz => classList.contains(clazz);

    function processScaledView(images) {
        for(const image of images) {
            const specificPredicate = classPredicate(image.classList);
            if(['threadlist_pic', 'j_m_pic'].every(specificPredicate)) {
                image.setAttribute('bpic', toSourceLink(image.getAttribute('bpic')));
                image.dataset.original = toSourceLink(image.dataset.original);
            }
        }
    }

    const images = document.getElementsByTagName("img");
    const url = location.href.replace(/^https?\:\/\//i, '');
    const postFix = url.replace(/tieba.baidu.com\//, '');

    if(postFix.startsWith('p')) {
        processPost(images);
    } else if (postFix.startsWith('f')) {
        // TODO excute until page data loaded
        // processScaledView(images);
    }

})();
