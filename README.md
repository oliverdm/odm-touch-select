# odm-touch-select

A JavaScript select input for dragging via mouse, touch or mousewheel.
Inspired by [Ariya Hidayat's posts on kinetic scrolling](http://ariya.ofilabs.com/2013/08/javascript-kinetic-scrolling-part-1.html).

### Features

 * Mouse and touch dragging
 * Mousewheel support
 * Change event emitted
 * JS API to get/select/add/remove list items
 * Number of items shown is adjustable
 * Appearance customizable

### Demo

[Example](http://oliverdm.github.io/odm-touch-select/demo.html)

### Browser Requirements

 * Array.prototype.forEach()
 * Object.keys()
 * element.querySelector()
 * element.querySelectorAll()
 * element.style.cssText
 * element.classList
 * CSS rem unit

No dependencies to external libraries.

### TODO

 * Add support for key presses (up/down arrow keys)
 * Highlight when focused
 * Add support for varying item heights
 * More animation eye candy
 * Code clean-up, testing, ...

### API

##### `TouchSelect([items], [config])`
Constructor that creates the JS shell for the HTML element.
 * `items`: An array of list items.
A list item can be a primitive type or an object with a `text` property. 
The `text` property should either return a string or HTML element.
In primitive types, `&<>"'/` characters are escaped before they are added to the DOM.
HTML elements are added as is.
 * `config`: An object with optional keys:
   * `items`: Instead of the items argument in the constructor
   * `viewSize`: The number of items that are visible simultaneously
   * `itemHeight`: The item height in pixels used to calculate offsets.
This property is only used for internal calculations and does not affect the appearance of items.
If not given, the height is determined automatically.
At the moment, all items need to have the same height.

##### `TouchSelect.build()`
Creates and returns the HTML select element that can be added to the DOM.
Must be called once before using the select object.

##### `TouchSelect.resize()`
Sets the boundaries for scrolling.
This function is called each time items are added or removed.

##### `TouchSelect.remove(index)`
Removes and returns the item at the specified index.

##### `TouchSelect.add(item, index)`
Adds the item at the specified index.

##### `TouchSelect.select(index)`
Selects the item at the specified index.

##### `TouchSelect.length`
The number of items.

##### `TouchSelect.items`
All items as an array.

##### `TouchSelect.element`
The HTML element.
Only available after calling `build()`.

##### `TouchSelect.selectedIndex`
The currently selected index or `-1` if no item is selected.

##### `TouchSelect.selectedItem`
The currently selected item or `null` if no item is selected.