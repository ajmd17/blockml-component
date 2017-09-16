if (typeof require === 'function') {
  var VDOM = require('./vdom');
}

function component (name, obj) {
  if (typeof name !== 'string') {
    throw new TypeError('first argument should be a string');
  }

  if (typeof obj !== 'object') {
    throw new TypeError('second argument should be an object');
  }

  return VDOM.register(name, obj);
};

if (typeof module === 'object') {
  module.exports = component;
}