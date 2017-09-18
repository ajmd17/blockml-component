if (typeof require === 'function') {
  var VDOM = require('./vdom');
}

function component(name, obj) {
  if (typeof name !== 'string') {
    throw new TypeError('first argument should be a string');
  }

  if (typeof obj !== 'object') {
    throw new TypeError('second argument should be an object');
  }

  return VDOM.register(name, obj);
};

/**
 * Turns an object into one that can be embedded in a component,
 * and can be used to refresh the state when changed.
 */
component.bind = function (thisArg, prop) {
  if (typeof prop === 'function') {
    return VDOM.bindEvent(thisArg || null, prop);
  } else {
    return prop;
  }
};

if (typeof module === 'object') {
  module.exports = component;
}