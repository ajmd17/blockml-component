# blockml-component

A component-based system with a virtual DOM for [blockml](https://github.com/ajmd17/blockml) (a simple language that creates HTML). It is similar to React and Angular, but intended to be as simple as possible.

Example usage:
```
var blockml = require('blockml');
blockml.component = require('blockml-component');

blockml.component('Page', {
  render: function (props, children) {
    return blockml`
      div {
        ${children}
      }
    `;
  }
});

// a custom "App" component that we can use in our code
blockml.component('App', {
  render: function (props, children) {
    return blockml`
      Page {
        h1 {
          "Hello World"
        }
        ${children}
      }
    `;
  }
});

// this will hold the rendered html
var html = blockml.render(`
  html {
    head;
    body {
      App {
        h1 {
          "Hello"
        }
      }
    }
  }
`));
```