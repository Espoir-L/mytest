/**
 * @file mip-story 组件
 * @author
 */

define(function (require) {
    'use strict';

    var util = require('util');
    var viewer = require('viewer');
    var platform = util.platform;
    var naboo = util.naboo;
    var viewport = require('viewport');
    var screenWidth = viewport.getWidth();

    function MIPStoryBackEnd(storyConfig) {
        this.storyConfig = storyConfig || {};
    }

    MIPStoryBackEnd.prototype.build = function () {
        var data = this.storyConfig;
        var replayStats = encodeURIComponent(
            JSON.stringify({
                type: 'click',
                data: ['_trackEvent', '小故事重播', '点击', window.location.href]
            })
        );
        var shareStats = encodeURIComponent(
            JSON.stringify({
                type: 'click',
                data: ['_trackEvent', '小故事分享', '点击', window.location.href]
            })
        );
        var share = data.share;
        var recommend = data.recommend;
        var items = recommend && recommend.items ? recommend.items : [];
        var recTpl = '';
        if (items && items.length) {
            var innerTpl = '';
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                innerTpl += ''
                    + '<div data-item>'
                    +    '<a href="' + item.url
                    +       '" class="recommend-item" style="background-image:url('
                    +       (item.cover || '') + ');background-size:cover;background-repeat:no-repeat;">'
                    +        '<span>' + (item.title || '') + '</span>'
                    +        '<span class="item-from" data-src="' + item.fromUrl + '">' + (item.from || '') + '</span>'
                    +    '</a>'
                    + '</div>';
            }
            recTpl = ''
                + '<div class="recommend">'
                +     '<a href="' + recommend.url + '">更多阅读</a>'
                +     '<mip-scrollbox>'
                +         '<div data-wrapper>'
                +            '<div data-inner>'
                +                '<div data-scroller>' + innerTpl + '</div>'
                +            '</div>'
                +        '</div>'
                +     '</mip-scrollbox>'
                + '</div>';
        }
        var shareTpl = this.showShareBtn() ? ''
                + '<span class="mip-backend-share" data-stats-baidu-obj="' + shareStats + '">'
                +   '<span class="mip-backend-preview-share-btn"></span>'
                +   '<span class="mip-backend-share-btn">分享</span>'
                + '</span>' : '';
        var historyTpl = history.length > 1 ? '<span class="mip-story-close mip-backend-close"></span>' : '';
        var middleClass = recTpl ? '' : 'mip-story-middle';
        var html = ''
            + '<aside class="mip-backend" style="background-image: url(' + share.background + ');">'
                +     historyTpl
                +     '<div class="mip-backend-outer ' + middleClass + '">'
                +         '<div class="mip-backend-preview" '
                +           'style="background-position:center;background-size:cover;background-image:url('
                +           share.thumbnail + ')" data-stats-baidu-obj="' + replayStats + '">'
                +             '<div class="mip-backend-preview-mask"></div>'
                +             '<div class="mip-backend-preview-thumbnail">'
                +                 '<span class="mip-backend-preview-replay-btn"></span>'
                +                 '<span>重播</span>'
                +             '</div>'
                +         '</div>'
                +         '<span class="mip-backend-description">' + share.title + '</span>'
                +         '<span class="mip-backend-info">'
                +             '<a href="' + share.fromUrl + '">' + share.from + '</a>'
                +         '</span>'
                +        shareTpl
                +        recTpl
                +    '</div>'
                + '</aside>';
        return html;
    };

    /**
     *
     * 由于分享在手百下有域名限制，源站不能分享，所以如果是源站并且手百下，隐藏分享
     *
     * @return {boolean} 是否展示分享按钮
     */
    MIPStoryBackEnd.prototype.showShareBtn = function () {
        if (!viewer.isIframed && platform.isBaiduApp()) {
            return false;
        }
        return true;
    };

    MIPStoryBackEnd.prototype.isShow = function (move) {
        var ele = document.querySelector('.mip-backend');
        if (ele.hasAttribute('showEnd')) {
            return true;
        }
        return false;
    };

    MIPStoryBackEnd.prototype.setCurrent = function (status) {
        var ele = document.querySelector('.mip-backend');
        if (status) {
            ele.setAttribute('current', '');
        }
        else {
            ele.removeAttribute('current');
        }
    };

    MIPStoryBackEnd.prototype.hasStatus = function (status) {
        var ele = document.querySelector('.mip-backend');
        return ele.hasAttribute(status);
    };

    MIPStoryBackEnd.prototype.clearStatus = function (status) {
        var ele = document.querySelector('.mip-backend');
        ele.removeAttribute(status);
    };

    MIPStoryBackEnd.prototype.clearCssMedia = function (status) {
        return;
    };
    MIPStoryBackEnd.prototype.setCssMedia = function (status) {
        return;
    };

    MIPStoryBackEnd.prototype.setPreActive = function (status, offset) {
        var ele = document.querySelector('.mip-backend');
        if (status) {
            ele.style.transform = 'translateX(' + offset + 'px)'
            ele.setAttribute('active', '');
        }
        else {
            ele.removeAttribute('active');
        }
    };

    MIPStoryBackEnd.prototype.setAllMedia = function (status) {
        return;
    };

    MIPStoryBackEnd.prototype.setRebound = function (changeMoveX) {
        var ele = document.querySelector('.mip-backend');
        ele.style.transform = 'translateX(' + changeMoveX + 'px)'
        ele.style['transition'] = 'transform .25s ease';
    };

    // 翻页动画
    MIPStoryBackEnd.prototype.setSlideNext = function (changeMoveX, eventEmiter, muted) {
        var ele = document.querySelector('.mip-backend');
        ele.style.transform = 'translateX(' + changeMoveX + 'px)'
        ele.style['transition'] = 'transform .5s ease';
    };


    MIPStoryBackEnd.prototype.setActiveStyle = function (move) {
        var ele = document.querySelector('.mip-backend')
        ele.style.transform = 'translateX(' + move + 'px)';
    };

    // 去掉动态添加的样式
    MIPStoryBackEnd.prototype.takeOutStyle = function (eventEmiter) {
        var ele = document.querySelector('.mip-backend')
        ele.removeAttribute('style');
    };

    MIPStoryBackEnd.prototype.show = function (move) {
        var ele = document.querySelector('.mip-backend');
        ele.style.transform = 'translateX(0px)';
        ele.style['transition'] = 'transform .5s ease';
        ele.setAttribute('showEnd', '');
    };

    MIPStoryBackEnd.prototype.hide = function () {
        var ele = document.querySelector('.mip-backend')
        ele.style.transform = 'translateX(100%)';
        ele.style['transition'] = 'transform .5s ease';
        // ele.removeAttribute('style');
        ele.removeAttribute('showEnd');
    };

    MIPStoryBackEnd.prototype.replayHide = function () {
        var ele = document.querySelector('.mip-backend')
        ele.removeAttribute('style');
        ele.removeAttribute('showEnd');
    };

    return MIPStoryBackEnd;
});
