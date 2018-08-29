// ==UserScript==
// @name                 Baidu TieBa - Automatic Sign Up
// @description          Automatically sign up all fourms the user subscribed.
// @name:zh-CN           贴吧自动签到 - 简陋版
// @description:zh-CN    自动给百度贴吧签到, 特别是小于7级的吧.
// @namespace            https://github.com/hnOsmium0001/tieba_auto_signup
// @supportURL           https://github.com/hnOsmium0001/tieba_auto_signup/issues
// @version              0.2.1
// @author               hnOsmium0001 <mail.osmium0001@hainan.net>
// @match                *://tieba.baidu.com/f?*kw=*
// @match                *://tieba.baidu.com/home/main*
// @run-at               document-end
// @grant                none
// ==/UserScript==

(function() {
    'use strict';

    var i;
    var AUTO_SIGN_MODE = false; //controls if close the tab after sign-up or not
    var href = document.location.href;

    //Main page
    if(href.indexOf('/home/main?') !== -1) {
        //TODO add button for start auto-sign up instead up directly do it on reload

        console.log('Detected tieba main page, started sign all bars');

        // show hidden fourms
        document.getElementsByClassName('j_show_more_forum')[0].click();

        // get all fourms that the user followed && has not been signed up yet
        var allFourms = document.getElementsByClassName('u-f-item unsign');
        for(i = 0; i < allFourms.length; i++) {
            allFourms[i].click();
        }

        return;
    }

    // if this is a fourm main page
    if(href.indexOf('/f?') !== -1 && href.indexOf('kw=') !== -1) {

        if(document.getElementsByClassName('signstar_signed')[0] === undefined) {
            document.getElementsByClassName('j_signbtn')[0].click(); // click the Sign Button
            console.log('Clicked sign button');

            //WIP, close the window after done sign-up
            if(AUTO_SIGN_MODE) {
                window.opener = null;
                window.open('', '_self');
                window.close();
            }
        } else {
            console.log('Already signed, no need for sign again');
        }

    }
})();
