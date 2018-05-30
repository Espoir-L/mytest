/**
 * @file mip-test 组件
 * @author
 */

define(function (require) {
    'use strict';

    var customElement = require('customElement').create();

    /* 生命周期 function list，根据组件情况选用，（一般情况选用 build、firstInviewCallback） start */
    // build 方法，元素插入到文档时执行，仅会执行一次
    customElement.prototype.build = function () {
        // this.element 可取到当前实例对应的 dom 元素
        var element = this.element;
        // element._index = index++;
        console.log('进入或离开可视区回调，每次状态变化都会执行：build');
    };

    // 创建元素回调
    customElement.prototype.createdCallback = function () {
        console.log('创建元素回调：created');
    };
    // 向文档中插入节点回调
    customElement.prototype.attachedCallback = function () {
        console.log('向文档中插入节点回调：attached');
    };
    // 从文档中移出节点回调
    customElement.prototype.detachedCallback = function () {
        console.log('向文档中插入节点回调：detached');
    };
    // 第一次进入可视区回调,只会执行一次，做懒加载，利于网页速度
    customElement.prototype.firstInviewCallback = function () {
        console.log('向文档中插入节点回调：first in viewport');
    };
    // 进入或离开可视区回调，每次状态变化都会执行
    customElement.prototype.viewportCallback = function (isInView) {
        // true 进入可视区;false 离开可视区
        console.log('进入或离开可视区回调，每次状态变化都会执行：viewportCallback')
        console.log('是否进入可视区：' + isInView);
    };
    // 控制viewportCallback、firstInviewCallback是否提前执行
    // 轮播图片等可使用此方法提前渲染
    customElement.prototype.prerenderAllowed = function () {
        // 判断条件，可自定义。返回值为true时,viewportCallback、firstInviewCallback会在元素build后执行
        var isCarouselImg = !!this.isCarouselImg;
        console.log('进入或离开可视区回调，每次状态变化都会执行：prerenderAllowed')
        console.log('是否提前渲染：' + isCarouselImg)
        return !!this.isCarouselImg;
    };
    /* 生命周期 function list，根据组件情况选用 end */

    return customElement;
});
