if (typeof require === 'function') {
  var blockml = require('blockml');
  var component = require('./index');
}

component('Page', {
  render: function (props, children) {
    return blockml`
      div {
        ${children}
      }
    `;
  }
});

component('App', {
  create: function () {
  },

  render: function (props, children) {
    return blockml`
      html {
        head;
        body {
          Page {
            h1 {
              "Hello World"
            }
            div {
              "My name is: "
            }
            ${children}
          }
        }
      }
    `;
  }
});


console.log(blockml.render(`
  App {
    h1 {
      "Hello"
    }
  }
`))