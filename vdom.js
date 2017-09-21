if (typeof require === 'function') {
  var blockml = require('blockml');
}

var COMPONENT_METHODS = [
  'render',
  'create'
];

/**
 * @typedef {{ create: Function, render: Function }} Component
 */

blockml.registerTemplateMiddleware(function (obj) {
  if (typeof obj === 'function') {
    var eventIndex = VDOM._events.push(obj) - 1;
    return '"(VDOM._events[' + eventIndex + '])(event)"';
  }

  return obj;
});

/**
 * This renders an __InnerChildren element.
 * whenever child elements are added to a component,
 * they are extracted and stored within the _cachedChildren array,
 * and an __InnerChildren component added in place with the attribute 'index'
 * (which signifies which element in _cachedChildren to use).
 * 
 * This custom handler will correctly splice in the child components.
 */
blockml.registerCustomBlockHandler('__InnerChildren', {
  createDOMNode: function (node) {
    var children = VDOM._getChildrenFromNode(node);

    return children.map(function (el) {
      return el.createDOMNode();
    });
  },

  renderToString: function (node) {
    var children = VDOM._getChildrenFromNode(node);

    return children.reduce(function (accum, el) {
      return accum + el.renderToString() + '\n';
    }, '');
  }
});

blockml.registerCustomAttributeHandler(function (attributeNode) {  
  var match = /@(.*)/.exec(attributeNode.name);
  if (match !== null) {
    // TODO: Store in events, set up handler on page load.

    // do not apply attribute.
    return null;
  }

  return attributeNode;
});

/**
 * @param {Number} eventIndex
 * @param {Number} propsIndex
 */
function BoundEvent(eventIndex, propsIndex) {
  this.eventIndex = eventIndex;
  this.propsIndex = propsIndex;
}

BoundEvent.prototype.toString = function () {
  // for 'onclick' etc. handlers on elements
  return 'VDOM._events[' + this.eventIndex + ']()';
};

/**
 * @param {Object} [schema]
 */
function PropsObject(schema) { // TODO add a way of validating props against schema
  this._props = {};
  this._lastProps = {};
  this._schema = schema || {};
}

PropsObject.prototype.get = function (key) {
  return this._props[key];
};

/**
 * @param {String} key
 * @param {*} value
 * @param {Boolean} [markDirty=true]
 */
PropsObject.prototype.set = function (key, value, markDirty) {
  if (markDirty === undefined) {
    markDirty = true;
  }

  this._props[key] = value;

  if (!markDirty) {
    // save on last props
    this._lastProps[key] = value;
  }

  return this;
};

PropsObject.prototype.getCurrentProperties = function () {
  console.log('this = ', this);
  return this._props;
};

/**
 * Merge in new props into the current one.
 * Does not set 'undefined' values in the new props object.
 * @param {Object} props
 * @returns {PropsObject}
 */
PropsObject.prototype.merge = function (obj) {
  if (typeof obj !== 'undefined') {
    for (var key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
        this._props[key] = obj[key];
      }
    }
  }

  return this;
};

PropsObject.prototype.checkIsDirty = function () {
  for (var key in this._props) {
    if (Object.prototype.hasOwnProperty.call(this._props, key)) {
      if (typeof this._lastProps[key] === 'undefined') {
        return true; // dirty - property added
      }

      if (this._props[key] !== this._lastProps[key]) {
        return true; // different
      }
    }
  }

  return false;
};

PropsObject.prototype.syncLastProps = function () {
  // NOTE: no need to delete extra props in _lastProps,
  // as _lastProps isn't iterated through in checkIsDirty(), only _props is.
  for (var key in this._props) {
    if (Object.prototype.hasOwnProperty.call(this._props, key)) {
      this._lastProps[key] = this._props[key];
    }
  }
};

var VDOM = {
  _cachedComponents: {},
  _cachedChildren: [],

  BoundEvent: BoundEvent,

  /** @type {BoundEvent[]} */
  _events: [],

  /** @type {PropsObject[]} */
  _storedProps: [],

  /**
   * Bind a function as an event. Returns a BoundEvent object,
   * which upon conversion to string will yield something that can be used in
   * HTML on* attributes.
   * @param {*} thisArg
   * @param {Function} fn
   * @param {PropsObject} propsObj
   * @returns {BoundEvent}
   */
  bindEvent: function (thisArg, fn, propsObj) {
    var eventIndex = VDOM._events.push(function () {
      fn.call(thisArg, window.event, propsObj.getCurrentProperties());

      // check if props have been modified.
      if (propsObj.checkIsDirty()) {
        // refresh component
        propsObj.syncLastProps();
      }
    }) - 1;

    return new BoundEvent(eventIndex);
  },

  /**
   * @param {String} name
   * @param {Component} obj
   */
  register: function (name, obj) {
    if (typeof this._cachedComponents[name] !== 'undefined') {
      throw new Error('Component `' + name + '` already registered!');
    }

    function createPropsForNode(node) {
      if (typeof node._props === 'undefined') {
        var propsObject = new PropsObject();

        // copy defined properties on object that are not methods to the props object.
        // methods will be stored, and the properties set to an object that converts to a string that will indicate which event to use
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'function') {
              // do not bind 'render', 'create', etc.
              if (COMPONENT_METHODS.indexOf(key) === -1) {
                obj[key] = VDOM.bindEvent(obj, obj[key], propsObject);
              }
            } else {
              propsObject.set(key, obj[key], false);
            }
          }
        }

        // copy attributes over to props - this will overwrite default props as expected.
        for (var i = 0; i < node.attributes.length; i++) {
          // 'value.value' is because AttributeNode's value is a StringNode.
          propsObject.set([node.attributes[i].name], node.attributes[i].value.value, false);
        }
      }

      node._props = propsObject.getCurrentProperties();
    }

    function renderChildrenPlaceholder(node) {
      var placeholderString = '';
      var childrenFiltered = node.children.filter(function (el) {
        return el !== undefined && el !== null;
      });

      if (childrenFiltered.length != 0) {
        // add a child element that will be stored and pasted as it goes
        var childrenIndex = VDOM._cachedChildren.push(childrenFiltered) - 1;
        placeholderString = '__InnerChildren index: "' + childrenIndex + '";';
      }

      return placeholderString;
    }

    function renderComponentToString(node) {
      // create placeholder for children
      var placeholderString = renderChildrenPlaceholder(node);

      if (typeof obj.render === 'undefined') {
        throw new TypeError('component `' + name + '`: the `render` function is required.');
      }

      if (typeof obj.render !== 'function') {
        throw new TypeError('component `' + name + '`: `render` must be a function.');
      }

      return obj.render.call(obj, node._props, placeholderString);
    }

    blockml.registerCustomBlockHandler(name, {
      createDOMNode: function (node) {
        createPropsForNode(node);
        
        var result = blockml.createDOMNodes(renderComponentToString(node));

        if (!(result instanceof Element)) {
          throw new TypeError('component `' + name + '`: `render` must return a valid DOM element.')
        }

        return result;
      },

      renderToString: function (node) {
        createPropsForNode(node);

        var result = blockml.render(renderComponentToString(node));

        if (typeof result !== 'string') {
          throw new TypeError('component `' + name + '`: `render` must return a string.')
        }

        return result;
      }
    });

    return this._cachedComponents[name] = obj;
  },

  /**
   * gets the references _cachedChildren element from a __InnerChildren placeholder element.
   */
  _getChildrenFromNode(node) {
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

    if (childrenIndex >= this._cachedChildren.length) {
      throw new Error('childrenIndex should be less than VDOM._cachedChildren.length. This is most likely a bug.');
    }

    var children = this._cachedChildren[childrenIndex];
    if (children === null || children === undefined) {
      throw new Error('No element with index of `' + childrenIndex + '` found.');
    }

    return children;
  }
};

if (typeof module === 'object') {
  module.exports = VDOM;
}