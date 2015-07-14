
(function(scope){
    "use strict";
    
    function measureItemHeight(element){
        var height = 0;
        if (Object.prototype.toString.call(element).substring(0, 12) !== '[object HTML') {
            return height;
        }
        // make a copy of the list with one item in it at max
        var copy = copyHtmlElement(element, function(i, child){
            if (i > 0 && child.className.indexOf(classPrefix + '-item') !== -1) {
                return false;
            }
            return true;
        });
        // make sure the list contains at least one item
        var list = copy.querySelector('.' + classPrefix + '-list');
        var listItem = list.firstChild;
        if (!listItem) {
            listItem = buildItem('test');
            list.appendChild(listItem);
        }
        // add copy to DOM off-screen
        var tmp = document.createElement("div");
        tmp.style.cssText = 'position:absolute;top:-9999px;max-height:1000px';
        tmp.appendChild(copy);
        document.body.appendChild(tmp);
        // measure height
        height = parseInt(getComputedStyle(listItem).height, 10);
        // remove copy from DOM
        document.body.removeChild(tmp);
        return height;
    }
    
    /**
     * Makes a copy of the HTMLElement and its children.
     * Only the style and class properties are copied for each element.
     * An optional callback can be specified to prevent copying of the current
     * child and subsequent sibling elements.
     * @param {Element} element the element to copy
     * @param {Function} callback a function that takes two arguments:
     * <ul>
     *   <li>i: the child index</li>
     *   <li>child: the child element</li>
     * </ul>
     * @returns {Element} a deep copy of the given element
     */
    function copyHtmlElement(element, callback){
        var copy = document.createElement(element.tagName);
        copy.className = element.className;
        copy.style.cssText = element.style.cssText;
        for (var i = 0, len = element.children.length; i < len; i++) {
            var child = element.children[i];
            if (callback && !callback(i, child)) {
                break;
            }
            var childCopy = copyHtmlElement(child, callback);
            copy.appendChild(childCopy);
        }
        return copy;
    }
    
    /**
     * Builds an HTMLElement that represents the given item.
     * @param {object|string|number} item a primitive type
     * (string, number, etc.) or an object with a <code>text</code>
     * property that can be an HTMLElement or a primitive type
     * @returns {Element} the HTMLElement
     */
    function buildItem(item){
        var el,
            text = item.text;
        if (Object.prototype.toString.call(text).substring(0, 12) === '[object HTML') {
            // item.text is an HTMLElement
            el = text;
        } else {
            el = document.createElement('span');
            el.textContent = ('' + (typeof text !== 'undefined' ? text : item))
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;")
                    .replace(/\//g, "&#x2F;");
        }
        var li = document.createElement('li');
        li.className = classPrefix + '-item';
        li.appendChild(el);
        return li;
    }
    
    /**
     * Returns whether this is a touch event.
     * @param {event} e the event object
     * @returns {boolean} true if this is a touch event
     */
    function isTouchEvent(e){
        return e.targetTouches && (e.targetTouches.length > 0);
    }
    
    /**
     * Returns the y-coordinate of the given event.
     * @param {event} e
     * @returns {number} the y-coordinate
     */
    function ypos(e){
        if (isTouchEvent(e)) {
            return e.targetTouches[0].clientY;
        }
        return e.clientY;
    }
    
    var defaults = {
            'viewSize': 2,
            'itemHeight': '',
        },
        classPrefix = 'touch-select',
        transform = 'transform',
        wheelEvent = 'wheel',
        touchSupport = typeof window.ontouchstart !== 'undefined';
    
    var dummyEl = document.createElement('div');
    
    // detect scroll wheel event
    if (!('onwheel' in dummyEl)) {
        wheelEvent = 'mousewheel';
    }
    
    // find CSS transformation property
    ['webkit', 'Moz', 'O', 'ms'].every(function (prefix) {
        var prop = prefix + 'Transform';
        if (typeof dummyEl.style[prop] !== 'undefined') {
            transform = prop;
            return false;
        }
        return true;
    });
    
    /**
     * Constructor
     * @param {Array} items the items (values), required if no configuration is
     * given, otherwise can be supplied as <code>item</code> property in the
     * config object
     * @param {Object} config an optional configuration object with keys:
     * <ul>
     *   <li>items: array of items</li>
     *   <li>viewSize: the number of items shown at the same time</li>
     *   <li>itemHeight: the height (in px) of the HTMLElement of each item</li>
     * </ul>
     */
    function TouchSelect(items, config){
        if (Object.prototype.toString.call(items) === '[object Object]') {
            config = items;
            items = null;
        }
        config = config || {};
        items = items || config['items'] || [];
        Object.keys(defaults).forEach(function(key){
            if (typeof config[key] === 'undefined') {
                config[key] = defaults[key];
            }
        });
        this.items = items;
        this.element = null;
        this.selectedIndex = -1;
        this.selectedItem = null;
        this._config = config;
        this._itemHeight = 0;
        this._min = 0;
        this._max = 0;
        this._pressed = false;
        this._reference = 0;
        this._offset = 0;
        this._scrollOverflow = 0;
    }
    
    /**
     * Read-only length property. Returns the number of items.
     */
    Object.defineProperty(TouchSelect.prototype, 'length', {
        get: function() {
            return this.items.length;
        }
    });
    
    TouchSelect.prototype['build'] = function(){
        // create elements
        var outer = document.createElement('div');
        outer.className = classPrefix;
        
        var inner = document.createElement('div');
        inner.className = classPrefix + '-inner';
        outer.appendChild(inner);
        
        var list = document.createElement('ol');
        list.className = classPrefix + '-list';
        inner.appendChild(list);
        
        var indicator = document.createElement('div');
        indicator.className = classPrefix + '-indicator';
        inner.appendChild(indicator);
        
        this.items.forEach(function(item){
            list.appendChild(buildItem(item));
        }, this);
        
        // register event listeners
        if (touchSupport) {
            inner.addEventListener('touchstart', this._tap.bind(this), false);
        }
        inner.addEventListener('mousedown', this._tap.bind(this), false);
        inner.addEventListener(wheelEvent, this._wheel.bind(this), false);
        
        this.element = outer;
        this.resize();
        this.select(0);
        return this.element;
    };
    
    TouchSelect.prototype['resize'] = function(){
        if (!this.element) {
            return;
        }
        var gridHeight = this._config['itemHeight'] || measureItemHeight(this.element);
        this._itemHeight = gridHeight;
        this._scrollOverflow = this._itemHeight/4;
        
        var size = this._config['viewSize'],
            intSize = Math.ceil(size),
            fraction = intSize - size,
            even = intSize % 2 === 0 ? 1 : 0,
            margin = (fraction + even) * gridHeight;
        size = Math.floor(size) - even;
        
        // min and max offsets
        this._min = Math.floor(-size*gridHeight/2 + (gridHeight/2) - margin/2);
        this._max = (this.items.length-1) * gridHeight + this._min;
        
        // set view height
        var list = this.element.querySelector('.' + classPrefix + '-list');
        list.style.height = size * gridHeight + margin + 'px';
        
        // set indicator height and center vertically
        var indicator = this.element.querySelector('.' + classPrefix + '-indicator');
        indicator.style.height = gridHeight + 'px';
        indicator.style.top = size/2 * gridHeight + margin/2 - gridHeight/2 + 'px';
        
//        console.log('size=', size, 'gridHeight=', gridHeight, 'height=', list.style.height, 'min=', this._min, 'max=', this._max, 'offset=', this._offset, 'margin=', margin);
    };
    
    TouchSelect.prototype['remove'] = function(idx){
        if (isNaN(idx) || !this.element || this.items.length === 0) {
            return;
        }
        var list = this.element.querySelector('.touch-select-list');
        if (list) {
            if (list.children.length > idx && this.items.length > idx) {
                // find successor item
                var nextIdx = idx;
                if (nextIdx === this.items.length -1) {
                    --nextIdx;
                }
                // remove from DOM and items
                list.removeChild(list.children[idx]);
                var removedItem = this.items.splice(idx, 1);
                this.resize();
                // scroll to successor item
                if (nextIdx < idx) {
                    this._scrollToIndex(nextIdx);
                }
                // fire change event
                this._fireChange();
                return removedItem;
            }
        }
    };
    
    TouchSelect.prototype['add'] = function(item, idx){
        if (!this.element) {
            return;
        }
        if (typeof idx === 'undefined') {
            idx = this.items.length;
        }
        var el = buildItem(item);
        var list = this.element.querySelector('.touch-select-list');
        if (list) {
            if (idx < this.items.length) {
                // insert in between
                list.insertBefore(el, list.children[idx]);
                this.items.splice(idx, 0, item);
            } else {
                // append to items
                list.appendChild(el);
                this.items.push(item);
            }
            this.resize();
            if (this.items.length === 1) {
                this._scrollToIndex(idx);
            }
            // fire change event
            this._fireChange();
            return item;
        }
    };
    
    TouchSelect.prototype['select'] = function(idx){
        this._scrollToIndex(idx);
        this._selectIndex(idx);
    };
    
    /**
     * Updates the selectedIndex and selectedItem property using the given
     * index.
     * @param {number} idx the index in the items array to select
     * @return {number} the selected index
     */
    TouchSelect.prototype._selectIndex = function(idx){
        if (idx >= this.items.length) {
            idx = this.items.length -1;
        }
        if (idx < -1) {
            idx = -1;
        }
        this.selectedIndex = idx;
        this.selectedItem = idx >= 0 ? this.items[idx] : null;
        return idx;
    };
    
    /**
     * Registers event listeners for mouse/touch tracking.
     * @param {boolean} touch true to register touch events
     */
    TouchSelect.prototype._startTracking = function(touch){
        if (this._dragListener || this._releaseListener) {
            this._stopTracking();
        }
        this._dragListener = this._drag.bind(this);
        this._releaseListener = this._release.bind(this);
        document.addEventListener(touch ? 'touchmove' : 'mousemove', this._dragListener, false);
        document.addEventListener(touch ? 'touchend' : 'mouseup', this._releaseListener, false);
    };
    
    /**
     * Unregisters event listeners for both mouse and touch tracking.
     */
    TouchSelect.prototype._stopTracking = function(){
        if (this._dragListener) {
            document.removeEventListener('mousemove', this._dragListener, false);
            document.removeEventListener('touchmove', this._dragListener, false);
            this._dragListener = null;
        }
        if (this._releaseListener) {
            document.removeEventListener('mouseup', this._releaseListener, false);
            document.removeEventListener('touchend', this._releaseListener, false);
            this._releaseListener = null;
        }
    };
    
    /**
     * Event handler for the mousedown or touchstart event.
     * @param {event} e the event object
     * @returns {boolean} always false
     */
    TouchSelect.prototype._tap = function(e){
        e.preventDefault();
        e.stopPropagation();
        this._startTracking(isTouchEvent(e));
        this.element.querySelector('.' + classPrefix + '-inner').classList.add('dragging');
        this._pressed = true;
        this._reference = ypos(e);
        return false;
    };
    
    /**
     * Event handler for the mousemove or touchmove event.
     * @param {event} e the event object
     * @returns {boolean} always false
     */
    TouchSelect.prototype._drag = function(e){
        e.preventDefault();
        e.stopPropagation();
        if (this._pressed) {
            var y = ypos(e);
            var delta = this._reference - y;
//            console.log('drag()', 'y=', y, 'delta=', delta);
            if (delta > 2 || delta < -2) {
                this._reference = y;
                this._scroll(this._getNormOffset() + delta, this._scrollOverflow);
            }
        }
        return false;
    };
    
    /**
     * Event handler for the mouseup or touchend event.
     * @param {event} e the event object
     * @returns {boolean} always false
     */
    TouchSelect.prototype._release = function(e){
        e.preventDefault();
        e.stopPropagation();
        this._stopTracking();
        this.element.querySelector('.' + classPrefix + '-inner').classList.remove('dragging');
        this._pressed = false;
//        console.log('release()', 'offset=', this._getNormOffset());
        this._snap(this._fireChange.bind(this));
        return false;
    };
    
    /**
     * Event handler for the wheel event.
     * @param {event} originalEvent the mouse wheel event object, can vary
     * between browsers
     */
    TouchSelect.prototype._wheel = function(originalEvent){
        // https://developer.mozilla.org/en-US/docs/Web/Events/wheel#Listening_to_this_event_across_browser
        var event = {
            target: originalEvent.target || originalEvent.srcElement,
            type: 'wheel',
            deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
            deltaX: 0,
            deltaY: originalEvent.deltaY,
            deltaZ: 0,
            preventDefault: function() {
                originalEvent.preventDefault();
            }
        };
        if (originalEvent.type === "mousewheel") {
            event.deltaY = - 1/40 * originalEvent.wheelDelta;
            if (originalEvent.wheelDeltaX) {
                event.deltaX = - 1/40 * originalEvent.wheelDeltaX;
            }
        }
        else if (typeof originalEvent.deltaY === 'undefined') {
            event.deltaY = originalEvent.detail;
        }
        var delta = event.deltaY < 0 ? -this._itemHeight : this._itemHeight;
        this._scroll(this._getNormOffset() + delta);
        this._fireChange();
    };
    
    /**
     * Returns the offset (y-coordinate) normalized to start at zero.
     * @returns {number} the y-coordinate
     */
    TouchSelect.prototype._getNormOffset = function(){
        return this._offset - this._min;
    };
    
    /**
     * Returns the currently selected item index.
     * @returns {number} the index
     */
    TouchSelect.prototype._findSelectedIndex = function(){
        var offset = this._getNormOffset();
//        console.log('_findSelectedIndex()', 'normOffset=', offset, 'itemHeight=', this._itemHeight);
        if (offset >= 0) {
            return Math.floor(offset / this._itemHeight);
        } else if (this.items.length > 0) {
            return 0;
        } else {
            return -1;
        }
//        return Math.floor(this._getNormOffset() / this._itemHeight);
    };
    
    /**
     * Scrolls to the y-coordinate.
     * @param {number} yNorm a normalized y-coordinate
     * @param {number} overflow optional, the amount by which the offset can go
     * below or above the minimum or maximu. Must be smaller than itemHeight/2
     * for snapping to recover back to the proper min/max values. Defaults to 0.
     */
    TouchSelect.prototype._scroll = function(yNorm, overflow) {
        overflow = overflow || 0;
//        if (yNorm < 0) {
//            yNorm = 0;
//        }
        var y = yNorm + this._min;
        if (y > this._max + overflow) {
            y = this._max + overflow;
        }
        else if (y < this._min - overflow) {
            y = this._min - overflow;
        }
        this._offset = y;
//        console.log('scroll()', 'yNorm=', yNorm, 'y=', y, 'offset=', this._offset);
        var list = this.element.querySelector('.' + classPrefix + '-list');
        list.style[transform] = 'translateY(' + (-this._offset) + 'px)';
//        indicator.style[xform] = 'translateY(' + (offset * relative) + 'px)';
    };
    
    /**
     * Scrolls to the y-coordinate that corresponds to the given index in the
     * items array.
     * @param {number} idx the item index
     */
    TouchSelect.prototype._scrollToIndex = function(idx){
        var yNorm = idx * this._itemHeight;
        this._scroll(yNorm);
    };
    
    /**
     * Aligns the current y-coordinate with the item grid. Requires that all
     * items have the same height.
     * @param {function|undefined} callback an optional callback function
     */
    TouchSelect.prototype._snap = function(callback){
        var gridHeight = this._itemHeight,
            gridDelta = this._getNormOffset() % gridHeight;
    
        if (gridDelta != 0) {
            var delta = -gridDelta;
            if (gridDelta >= gridHeight/2) {
                delta = gridHeight - gridDelta;
            }
//            console.log('snap()', 'delta=', delta);
            this._scrollAnim(this._getNormOffset() + delta, callback);
        }
        else if (Object.prototype.toString.call(callback) === '[object Function]') {
            callback();
        }
    };
    
    /**
     * Animates the translateY style property asynchronously.
     * @param {number} y the normalized y-coordinate
     * @param {number|function} duration either the duration in milliseconds or
     * a callback function, defaults to 400
     * @param {function|undefined} callback optional callback function
     */
    TouchSelect.prototype._scrollAnim = function(y, duration, callback){
        if (Object.prototype.toString.call(duration) === '[object Function]') {
            callback = duration;
            duration = null;
        }
        duration = duration || 400;
        var from = this._getNormOffset(),
            to = y,
            delta = to - from,
            frames = Math.ceil(duration / 60),
            frameCount = 0,
            self = this;
//        console.log('scrollAnim()', 'from=', from, 'to=', to, 'delta=', delta, 'frames=', frames);
        if (!isNaN(frames) && frames > 0 && delta != 0) {
            requestAnimationFrame(function animY(){
                frameCount++;
                if (frameCount <= frames) {
                    var frameDelta = Math.ceil(frameCount * (delta / frames));
//                    console.log('animY', 'frameDelta=', frameDelta, 'frameY=', from + frameDelta);
                    self._scroll(from + frameDelta, self._scrollOverflow);
                    requestAnimationFrame(animY);
                } else {
//                    console.log('animY', 'offset=', self._getNormOffset());
                    if (Object.prototype.toString.call(callback) === '[object Function]') {
                        callback();
                    }
                }
            });
        }
    };
    
    /**
     * Dispatches a change event if the selected index or the item at the
     * selected index has changed.
     */
    TouchSelect.prototype._fireChange = function(){
        var newIdx = this._findSelectedIndex(),
            newItem = typeof this.items[newIdx] !== 'undefined' ? this.items[newIdx] : null;
//        console.log('new index=', newIdx, 'old index=', this.selectedItem, 'new item=', newItem, 'old item=', this.selectedItem);
        if (newIdx !== this.selectedIndex || newItem !== this.selectedItem) {
            this._selectIndex(newIdx);
            var detail = {'index': newIdx, 'value': this.selectedItem};
            var event;
            try {
                event = new CustomEvent('change', {'detail': detail});
            } catch (e) {
                var event = document.createEvent('Event');
                event.detail = detail;
                event.initEvent('change', true, true);
            }
            this.element.dispatchEvent(event);
        }
    };
    
    scope['TouchSelect'] = TouchSelect;
    
})(window);
