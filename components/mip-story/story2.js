/**
 * @file mip-story 组件
 * @author
 */

define(function (require) {
    'use strict';

    var MUTE = 'mute';
    var SWIP = 'swip';
    var UNMUTE = 'unmute';
    var REPLAY = 'replay';
    var SLIDEMOVING = 'slideMoving';
    var SHOWBOOKEND = 'showbookend';
    var CLOSEBOOKEND = 'closebookend';
    var TAPNAVIGATION = 'tapnavigation';
    var SHOWNOPREVIOUSPAGEHELP = 'shownopreviouspagehelp';
    var VISIBILITYCHANGE = 'visibilitychange';
    var MIP_I_STORY_STANDALONE = 'mip-i-story-standalone';
    var SWITCHPAGEND = 'switchPageEnd';
    var RESETVIEWFORSWITCH = 'resetViewForSwitch';
    var RESETVIEWFORSTYLE = 'resetViewForStyle';
    var OPENAUTOPLAY = 'openAutoplay';
    var REPLAYBOOKEND = 'replayBookend';
    // 翻页阀值

    require('./mip-story-view');
    require('./mip-story-layer');
    var Audio = require('./audio');
    var ShareLayer = require('./mip-story-share');
    var HintLayer = require('./mip-story-hint');
    var BookEnd = require('./mip-story-bookend');
    var customElement = require('customElement').create();
    var animatePreset = require('./animate-preset');
    var util = require('util');
    var dm = util.dom;
    var EventEmitter = util.EventEmitter;
    var Gesture = util.Gesture;
    var Progress = require('./mip-progress');
    var storyViews = [];
    var viewport = require('viewport');
    var $ = require('zepto');
    var SWITCHPAGE_THRESHOLD = viewport.getWidth() * 0.2;

    function MIPStory(element) {
        this.element = element;
        this.win = window;
        this.currentIndex = this.preInex = this.nextIndex = 0;
        this.touchstartX = this.touchendX = 0;
        this.screenWidth = viewport.getWidth();
        this.moveFlag = false;
    }
    MIPStory.prototype.getConfigData = function () {

        var configData = this.element.querySelector('mip-story > script[type="application/json"]');

        try {
            return JSON.parse(configData.innerText);
        } catch (e) {
            console.error(e);
        }
        return {};
    };
    MIPStory.prototype.init = function () {
        var element = this.element;
        var html = this.win.document.documentElement;
        var mipStoryConfigData = this.getConfigData();
        html.setAttribute('id', MIP_I_STORY_STANDALONE);
        // 保存 story views
        this.initStoryViews();
        // 初始化音频
        this.initAudio();
        // 初始化结尾页
        this.initBookend(mipStoryConfigData);
        // 初始化引导页
        this.initHintLayer(element);
        // 初始化分享页面
        this.initShare(mipStoryConfigData);
        // 切换到第一页
        this.initViewForSwitch({ status: 1, notIncrease: 1 });
        // 绑定事件
        this.initEvent();
    };

    MIPStory.prototype.initAudio = function () {
        var au = this.element.getAttribute('background-audio');
        if (au) {
            this.audio = new Audio().build(this.element, au);
        }
        this.muted = false;
        this.viewMuted = !!(this.muted || this.audio);
    };

    MIPStory.prototype.initShare = function (storyConfig) {
        var shareConfig = storyConfig.share || {};
        this.share = new ShareLayer(shareConfig);
        var html = dm.create(this.share.build());
        this.element.appendChild(html);
    };

    MIPStory.prototype.initHintLayer = function (element) {
        this.hint = new HintLayer(element);
        var html = dm.create(this.hint.build());
        this.element.appendChild(html);
    };

    MIPStory.prototype.initEvent = function () {
        var self = this;
        var preEle = storyViews[this.preInex];
        var currentEle = storyViews[this.currentIndex];
        var nextEle = storyViews[this.nextIndex];
        var gesture = new Gesture(this.element, {
            preventX: false
        });
        this.element.addEventListener('click', function (e) {
            self.emitter.trigger(TAPNAVIGATION, e);
        });
        // 页面切换到后台
        document.addEventListener(VISIBILITYCHANGE, function (e) {
            self.emitter.trigger(VISIBILITYCHANGE, e);
        });
        // 绑定滑动事件
        this.element.addEventListener('touchstart', function (e) {
            if (self.moveFlag) {
                return;
            }
            var touch = e.targetTouches[0];
            self.touchstartX = touch.pageX;
            self.touchstartY = touch.pageY;
            // 触发音频文件播放
            self.emitter.trigger(OPENAUTOPLAY, e);
        });
        this.element.addEventListener('touchmove', function (e) {
            if (self.moveFlag) {
                return;
            }
            var touch = e.targetTouches[0];
            var moveX = touch.pageX;
            var moveY = touch.pageY;
            // 阻止Y轴滚动
            if (moveY != self.touchstartY) {
                e.preventDefault();
            }
            // 左滑动
            if ((moveX - self.touchstartX) <= 0) {
                self.emitter.trigger(SLIDEMOVING, { e: e, status: 1 });
            }
            // 右滑动
            else {
                self.emitter.trigger(SLIDEMOVING, { e: e, status: 0 });
            }
        });
        this.element.addEventListener('touchend', function (e) {
            if (self.moveFlag) {
                return;
            }
            var touch = e.changedTouches[0];
            self.touchendX = touch.pageX;
            self.touchendY = touch.pageY;
            // 只是点击当前页面的内容
            if (self.touchendX == self.touchstartX && self.touchendY == self.touchstartY) {
                e.preventDefault();
                e.stopPropagation();
                self.emitter.trigger(TAPNAVIGATION, e);
            }
            // 判断页面是否滑动翻页
            else {
                self.moveFlag = true;
                var isLeft = (self.touchendX - self.touchstartX) <= 0 ? 1 : 0;
                // 判断滑动的距离小于阀值（SWITCHPAGE_THRESHOLD）弹回
                if (Math.abs(self.touchendX - self.touchstartX) <= SWITCHPAGE_THRESHOLD) {
                    self.emitter.trigger(SWITCHPAGEND, { e: e, isPageTurn: 0, isLeft: isLeft });
                }
                // 判断滑动的距离大于阀值（SWITCHPAGE_THRESHOLD）翻页
                else {
                    self.emitter.trigger(SWITCHPAGEND, { e: e, isPageTurn: 1, isLeft: isLeft });
                }
                self.touchstartX = self.touchendX = 0;
            }
        });
        // 初始化自定义事件
        self.bindEvent();
    };

    // 判断是否是end页
    MIPStory.prototype.isBookEnd = function (e) {
        var isBookEnd = false;
        for (var i = 0; i < storyViews.length; i++) {
            if (storyViews[i].hasAttribute('current') && (i == storyViews.length - 1)) {
                isBookEnd = true;
            }
        }
        return isBookEnd;
    };

    MIPStory.prototype.visibilitychange = function (e) {
        var hiddenProperty = 'hidden' in document ? 'hidden'
            : 'webkitHidden' in document ? 'webkitHidden'
                : 'mozHidden' in document ? 'mozHidden' : null;
        var currentEle = storyViews[this.currentIndex];
        if (document[hiddenProperty]) {
            this.pauseGlobalAudio();
            currentEle.customElement.pauseAllMedia();
        }
        else {
            this.playGlobalAudio();
            currentEle.customElement.resumeAllMedia();
        }
    };

    MIPStory.prototype.initBookend = function (storyConfig) {
        this.bookEnd = new BookEnd(storyConfig);
        var html = dm.create(this.bookEnd.build());
        this.element.appendChild(html);
    };

    MIPStory.prototype.initProgress = function () {
        if (this.progress) {
            return;
        }
        var audioHide = this.element.hasAttribute('audio-hide');
        this.progress = new Progress(this.element, storyViews, audioHide);
        var html = dm.create(this.progress.build());
        this.element.appendChild(html);
        this.progress.updateProgress(0, 1);
    };

    MIPStory.prototype.initStoryViews = function () {
        storyViews = this.element.querySelectorAll('mip-story-view');
    };

    MIPStory.prototype.bindEvent = function () {
        this.emitter = new EventEmitter();
        this.emitter.on(MUTE, this.mute.bind(this));
        this.emitter.on(SWIP, this.swip.bind(this));
        this.emitter.on(UNMUTE, this.unmute.bind(this));
        this.emitter.on(REPLAY, this.replay.bind(this));
        this.emitter.on(TAPNAVIGATION, this.tapnavigation.bind(this));
        this.emitter.on(SLIDEMOVING, this.slideMoving.bind(this));
        this.emitter.on(SHOWBOOKEND, this.showbookend.bind(this));
        this.emitter.on(CLOSEBOOKEND, this.closebookend.bind(this));
        this.emitter.on(VISIBILITYCHANGE, this.visibilitychange.bind(this));
        this.emitter.on(SHOWNOPREVIOUSPAGEHELP, this.shownopreviouspagehelp.bind(this));
        this.emitter.on(SWITCHPAGEND, this.switchPageEnd.bind(this));
        this.emitter.on(RESETVIEWFORSWITCH, this.resetViewForSwitch.bind(this));
        this.emitter.on(RESETVIEWFORSTYLE, this.resetViewForStyle.bind(this));
        this.emitter.on(OPENAUTOPLAY, this.openAutoplay.bind(this));
        this.emitter.on(REPLAYBOOKEND, this.replayBookEnd.bind(this));
    };

    MIPStory.prototype.swip = function (e) {
        if (e.data.swipeDirection === 'left'
            || e.data.swipeDirection === 'right') {
            var backend = document.querySelector('.mip-backend');
            if (dm.contains(backend, e.target)) {
                return;
            }
            this.hint.toggleSystemLater();
        }
        // 翻页逻辑
        var centerX = (this.element.offsetLeft + this.element.offsetWidth) / 2;
        // 向右切换
        if (e.pageX > centerX) {
            this.emitter.trigger(SLIDEMOVING, { e: e, status: 1 });
        }
        // 向左切换
        else {
            this.emitter.trigger(SLIDEMOVING, { e: e, status: 0 });
        }
    };

    MIPStory.prototype.openAutoplay = function (e) {
        // 如果视频/音频不能 autoplay，则主动触发
        if (!this.hasPlay && !this.muted) {
            this.emitter.trigger(UNMUTE, e);
            this.hasPlay = true;
        }
    }

    MIPStory.prototype.tapnavigation = function (e) {
        // a 标签不做任何处理；
        if (e.target.nodeName.toLocaleLowerCase() === 'a') {
            return;
        }
        e.stopPropagation();
        var backend = document.querySelector('.mip-backend');
        var replay = document.querySelector('.mip-backend-preview');
        var shareBtn = document.querySelector('.mip-backend-share');
        var shareArea = document.querySelector('.mip-story-share');
        var cancelBtn = document.querySelector('.mip-story-share-cancel');
        var back = 'mip-story-close';
        var audio = document.querySelector('.mip-stoy-audio');
        var recommend = document.querySelector('.recommend');

        // 推荐
        if (dm.contains(recommend, e.target)) {
            var ele = document.querySelector('.item-from');
            var src = e.target.getAttribute('data-src');
            if (ele === e.target && src) {
                e.preventDefault();
                window.top.location.href = src;
            }
            return;
        }
        // 返回上一页
        if (this.hasClass(e, back)) {
            history.back();
            return;
        }
        // 静音控制
        if (e.target === audio) {
            var enabled = audio.hasAttribute('muted');
            enabled ? this.emitter.trigger(UNMUTE, e)
                : this.emitter.trigger(MUTE, e);
            return;
        }
        // 重头开始播放
        if (dm.contains(replay, e.target)) {
            this.emitter.trigger(REPLAY);
            this.progress.updateProgress(0, 1);
            return;
        }
        // 结尾页点击逻辑
        else if (dm.contains(backend, e.target)) {
            // 弹出分享
            if (dm.contains(shareBtn, e.target)) {
                this.share.showShareLayer();
                this.moveFlag = true;
            }
            return;
        }
        // 分享点击
        else if (dm.contains(shareArea, e.target)) {
            // 关闭分享界面
            if (e.target === cancelBtn) {
                this.share.hideShareLayer();
                this.moveFlag = false;
            }
            return;
        }
    };

    MIPStory.prototype.hasClass = function (e, clsName) {
        var reg = new RegExp('\\s*' + clsName + '\\s*');
        return !!reg.exec(e.target.className);
    };

    MIPStory.prototype.initViewForSwitch = function (data) {
        var reload = this.element.hasAttribute('audio-reload');
        this.preInex = this.currentIndex = this.nextIndex = 0;
        this.initProgress();
        var preEle = storyViews[this.preInex];
        var currentEle = storyViews[this.currentIndex];
        var nextEle = storyViews[this.nextIndex];
        this.setCurrentPage();
        this.setPageStyle();
        if (storyViews.length >= 2) {
            this.nextIndex = this.currentIndex + 1;
            nextEle = storyViews[this.nextIndex];
            nextEle.customElement.setPreActive(true, this.screenWidth, this.emitter);
        }
        currentEle.customElement.setAllMedia(true, this.viewMuted, reload, this.emitter);
    };

    MIPStory.prototype.slideMoving = function (data) {
        this.hint.hideDamping();
        this.hint.hideSystemLater();
        // 滑动翻页逻辑
        var touch = data.e.targetTouches[0];
        var moveX = touch.pageX - this.touchstartX;
        var currentEle = storyViews[this.currentIndex];
        var preEle = storyViews[this.preInex];
        var nextEle = storyViews[this.nextIndex];
        var nextActiveMove = this.screenWidth + moveX;
        var preActiveMove = - this.screenWidth + moveX;
        // 判断是否是第一页往左边滑动
        if (data.status === 0 && this.currentIndex <= 0) {
            self.moveFlag = false;
            this.emitter.trigger(SHOWNOPREVIOUSPAGEHELP);
            currentEle.customElement.setRebound(0, this.emitter);
            nextEle.customElement.setRebound(this.screenWidth, this.emitter);
            return;
        }
        // 判断是否是最后一页往后边滑动
        else if (!data.notIncrease && data.status === 1
            && this.currentIndex + 1 >= storyViews.length) {
            self.moveFlag = false;
            if (this.bookEnd.isShow()) {
                return;
            }
            this.bookEnd.showMoving(nextActiveMove);
        }
        else {
            if (this.bookEnd.isShow()) {
                currentEle.customElement.setActiveStyle(preActiveMove, this.emitter);
                this.bookEnd.showMoving(moveX);
                return;
            }
        }
        if (this.currentIndex != this.preInex) {
            preEle.customElement.setActiveStyle(preActiveMove, this.emitter);
        }
        if (this.currentIndex != this.nextIndex) {
            nextEle.customElement.setActiveStyle(nextActiveMove, this.emitter);
        }
        currentEle.customElement.setActiveStyle(moveX, this.emitter);
    };

    MIPStory.prototype.switchPageEnd = function (data) {
        this.hint.hideDamping();
        this.hint.hideSystemLater();
        var self = this;
        var preEle = storyViews[this.preInex];
        var currentEle = storyViews[this.currentIndex];
        var nextEle = storyViews[this.nextIndex];
        var bookEndContainer = $('.mip-backend')[0];
        // 判断是否是第一页往左边滑动页面状态不变
        if (data.isLeft === 0 && this.currentIndex <= 0) {
            self.moveFlag = false;
            this.emitter.trigger(SHOWNOPREVIOUSPAGEHELP);
            return;
        }
        // 判断是否是最后一页往后边滑动页面状态不变
        else if (!data.notIncrease && data.isLeft === 1
            && this.currentIndex + 1 >= storyViews.length) {
            self.moveFlag = false;
            if (this.bookEnd.isShow()) {
                return;
            }
            this.emitter.trigger(SHOWBOOKEND);
        }
        // 不可翻页——当前页面弹回+下一页弹回+去掉style添加的动态属性和active
        if (data.isPageTurn == 0) {
            var currentChangeMoveX = 0;
            var nextChangeMoveX = this.screenWidth;
            if (this.preInex != this.currentIndex) {
                preEle.customElement.setRebound(- this.screenWidth, this.emitter);
            }
            if (this.nextIndex != this.currentIndex) {
                nextEle.customElement.setRebound(nextChangeMoveX, this.emitter);
            }
            currentEle.customElement.setRebound(currentChangeMoveX, this.emitter);
            var transitionFlag = true;
            currentEle.addEventListener('transitionend', function (e) {
                if (e.target === this && transitionFlag) {
                    transitionFlag = false;
                    self.moveFlag = false;
                    self.emitter.trigger(RESETVIEWFORSTYLE);
                }
            });
            currentEle.addEventListener('webkitTransitionEnd', function () {
                alert('webkitTransitionEnd')
                if (e.target === this && transitionFlag) {
                    transitionFlag = false;
                    self.moveFlag = false;
                    self.emitter.trigger(RESETVIEWFORSTYLE);
                }
            });
        }
        // 可以翻页——滑动到下一页，改变当前页和下一页的index,touch的锚点距离归位
        else {
            var currentMoveEndX = this.screenWidth;
            var nextMoveEndX = 0;
            // 向左滑动
            if (data.isLeft === 0) {
                if (this.bookEnd.isShow()) {
                    this.emitter.trigger(CLOSEBOOKEND);
                    preEle.customElement.setSlideNext(- currentMoveEndX, this.emitter, this.viewMuted);
                    currentEle.customElement.setSlideNext(nextMoveEndX, this.emitter, this.viewMuted);
                    var transitionMoveFlag = true;
                    bookEndContainer.addEventListener('transitionend', function (e) {
                        if (e.target === this && transitionMoveFlag) {
                            transitionMoveFlag = false;
                            self.moveFlag = false;
                            bookEndContainer.removeAttribute('style');
                        }
                    })
                    return;
                }
                preEle.customElement.setSlideNext(nextMoveEndX, this.emitter, this.viewMuted);
            }
            // 向右滑动
            else {
                currentMoveEndX = - this.screenWidth;
                nextEle.customElement.setSlideNext(nextMoveEndX, this.emitter, this.viewMuted);
            }
            currentEle.customElement.setSlideNext(currentMoveEndX, this.emitter, this.viewMuted);
            // 重新设置页面状态
            var transitionMoveFlag = true;
            currentEle.addEventListener('transitionend', function (e) {
                if (e.target === this && transitionMoveFlag) {
                    transitionMoveFlag = false;
                    self.moveFlag = false;
                    self.emitter.trigger(RESETVIEWFORSWITCH, { isLeft: data.isLeft });
                }
            });
            currentEle.addEventListener('webkitTransitionEnd', function () {
                if (e.target === this && transitionMoveFlag) {
                    transitionMoveFlag = false;
                    self.moveFlag = false;
                    self.emitter.trigger(RESETVIEWFORSWITCH, { isLeft: data.isLeft });
                }
            });
        }
    }

    MIPStory.prototype.resetViewForStyle = function () {
        var preEle = storyViews[this.preInex];
        var currentEle = storyViews[this.currentIndex];
        var nextEle = storyViews[this.nextIndex];
        if (this.preInex != this.currentIndex) {
            preEle.customElement.takeOutStyle(this.emitter);
            preEle.customElement.setActiveStyle(- this.screenWidth, this.emitter);
        }
        if (this.nextIndex != this.currentIndex) {
            nextEle.customElement.takeOutStyle(this.emitter);
            nextEle.customElement.setActiveStyle(this.screenWidth, this.emitter);
        }
        currentEle.customElement.takeOutStyle(this.emitter);
    }

    MIPStory.prototype.setCurrentPage = function (status) {
        for (var i = 0; i < storyViews.length; i++) {
            if (i === this.currentIndex) {
                storyViews[i].setAttribute('current', '');
            }
            else {
                storyViews[i].removeAttribute('current');
            }
            if (storyViews[i].hasAttribute('active')) {
                storyViews[i].removeAttribute('active');
            }
        }
    };

    MIPStory.prototype.setPageStyle = function (status) {
        for (var i = 0; i < storyViews.length; i++) {
            if (storyViews[i].hasAttribute('style')) {
                storyViews[i].removeAttribute('style');
                if (i != this.preInex && i != this.currentIndex && i != this.nextIndex) {
                    storyViews[i].customElement.clearCssMedia();
                }
            }
        }
    };

    MIPStory.prototype.resetViewForSwitch = function (data) {
        if (this.bookEnd.isShow()) {
            return;
        }
        // 左滑动
        if (data.isLeft == 1) {
            this.preInex = this.currentIndex;
            this.currentIndex = this.currentIndex + 1;
            this.nextIndex = this.currentIndex + 1 >= storyViews.length ? this.currentIndex : this.currentIndex + 1;
        }
        // 右滑动
        else {
            this.nextIndex = this.currentIndex;
            this.currentIndex = this.preInex;
            this.preInex = this.preInex - 1 < 0 ? this.preInex : this.preInex - 1;
        }
        var preEle = storyViews[this.preInex];
        var currentEle = storyViews[this.currentIndex];
        var nextEle = storyViews[this.nextIndex];
        this.setCurrentPage();
        this.setPageStyle();
        var reload = this.element.hasAttribute('audio-reload');
        if (this.preInex != this.currentIndex) {
            preEle.customElement.setPreActive(true, - this.screenWidth, this.emitter);
            preEle.customElement.setAllMedia(false, this.viewMuted, reload, this.emitter);
        }
        if (this.nextIndex != this.currentIndex) {
            nextEle.customElement.setPreActive(true, this.screenWidth, this.emitter);
            nextEle.customElement.setAllMedia(false, this.viewMuted, reload, this.emitter);
        }
        currentEle.customElement.setCurrent(true, this.emitter);
        currentEle.customElement.setAllMedia(true, this.viewMuted, reload, this.emitter);
        currentEle.customElement.setCssMedia(true, this.viewMuted, this.emitter);
        this.progress.updateProgress(this.currentIndex, data.isLeft);
    };

    MIPStory.prototype.showbookend = function () {
        this.bookEnd.show();
    };

    MIPStory.prototype.closebookend = function () {
        this.bookEnd.hide();
        this.share.hideShareLayer();
    };

    MIPStory.prototype.replayBookEnd = function () {
        this.bookEnd.replayHide();
        this.share.hideShareLayer();
    };

    MIPStory.prototype.muteGlobalAudio = function () {
        if (this.audio) {
            this.audio.pause();
            this.audio.muted = true;
        }
    };

    MIPStory.prototype.unMuteGlobalAudio = function () {
        if (this.audio) {
            this.audio.play();
            this.audio.muted = false;
        }
    };

    MIPStory.prototype.playGlobalAudio = function () {
        if (this.audio && !this.muted) {
            this.audio.play();
        }
    };

    MIPStory.prototype.pauseGlobalAudio = function () {
        if (this.audio) {
            this.audio.pause();
        }
    };

    MIPStory.prototype.mute = function (e) {
        this.muted = true;
        this.viewMuted = true;
        this.muteGlobalAudio();
        var ele = storyViews[this.currentIndex];
        ele.customElement.toggleAllMedia(e, this.viewMuted);
        e.target.setAttribute('muted', '');
    };

    MIPStory.prototype.unmute = function (e) {
        this.muted = false;
        this.viewMuted = false;
        this.unMuteGlobalAudio();
        this.playGlobalAudio();
        var ele = storyViews[this.currentIndex];
        ele.customElement.toggleAllMedia(e, this.viewMuted);
        e.target.removeAttribute('muted');
    };

    MIPStory.prototype.replay = function () {
        this.currentIndex = 0;
        this.preInex = storyViews.length - 1;
        this.initViewForSwitch({ status: 1, notIncrease: 1 });
        this.emitter.trigger(REPLAYBOOKEND);
    };

    MIPStory.prototype.shownopreviouspagehelp = function () {
        this.hint.showDamping();
    };

    /**
     * 第一次进入可视区回调，只会执行一次
     */
    customElement.prototype.firstInviewCallback = function () {
        var mipStory = new MIPStory(this.element);

        require('./web-animation');
        mipStory.init();
    };

    return customElement;
});
