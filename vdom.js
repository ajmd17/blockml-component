if (typeof require === 'function') {
  var blockml = require('blockml');
}

/**
 * @typedef {{ create: Function, render: Function }} Component
 */

/**
 * This renders an __InnerChildren element.
 * whenever child elements are added to a component,
 * they are extracted and stored within the _cachedChildren array,
 * and an __InnerChildren component added in place with the attribute 'index'
 * (which signifies which element in _cachedChildren to use).
 * 
 * This custom handler will correctly splice in the child components.
 */
blockml.registerCustomHandler('__InnerChildren', {
  renderToString: function (node) {
    var childrenIndex = -1;

    // find 'index' attribute. It should be the only attribute.
    // it is ued to find the index for the _cachedChildren array.
    for (var i = 0; i < node.attributes.length; i++) {
      if (node.attributes[i].name == 'index') {
        // 'value.value' is because AttributeNode's value is a StringNode.
        childrenIndex = parseInt(node.attributes[i].value.value, 10);
        break;
      }
    }

    if (childrenIndex == -1) {
      throw new Error('`index` attribute not found on __InnerChildren element.');
    }

    if (childrenIndex >= VDOM._cachedChildren.length) {
      throw new Error('childrenIndex should be less than VDOM._cachedChildren.length. This is most likely a bug.');
    }

    var children = VDOM._cachedChildren[childrenIndex];
    if (children === null || children === undefined) {
      throw new Error('No element with index of `' + childrenIndex + '` found.');
    }

    return children.reduce(function (accum, el) {
      return accum + el.renderToString();
    }, '');
  }
});

var VDOM = {
  _cachedComponents: {},
  _cachedChildren: [],

  /**
   * @param {String} name
   * @param {Component} obj
   */
  register: function (name, obj) {
    if (typeof this._cachedComponents[name] !== 'undefined') {
      throw new Error('Component `' + name + '` already registered!');
    }

    blockml.registerCustomHandler(name, {
      renderToString: function (node) {
        if (typeof node._props === 'undefined') {
          node._props = {};

          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              if (typeof obj[key] !== 'function') {
                node._props[key] = obj[key];
              }
            }
          }
        }

        if (typeof obj.render === 'undefined') {
          throw new TypeError('component `' + name + '`: the `render` function is required.');
        }

        if (typeof obj.render !== 'function') {
          throw new TypeError('component `' + name + '`: `render` must be a function.');
        }

        var placeholderString = '';
        var childrenFiltered = node.children.filter(function (el) {
          return el !== undefined && el !== null;
        });

        if (childrenFiltered.length != 0) {
          // add a child element that will be stored and pasted as it goes
          var childrenIndex = VDOM._cachedChildren.push(childrenFiltered) - 1;
          placeholderString = '__InnerChildren index: "' + childrenIndex + '";';
        }

        var result = obj.render.call(obj, node._props, placeholderString);

        if (typeof result !== 'string') {
          throw new TypeError('component `' + name + '`: `render` must return a string.')
        }

        return result;
      }
    });

    return this._cachedComponents[name] = obj;
  }
};

if (typeof module === 'object') {
  module.exports = VDOM;
}