if (typeof require === 'function') {
  var blockml = require('blockml');
  blockml.component = require('../');
}

blockml.component('Page', {
  render: function (props, children) {
    return `
      div {
        ${children}
      }
    `;
  }
});

blockml.component('App', {
  create: function () {
  },

  render: function (props, children) {
    return `
      html {
        head;
        body {
          Page {
            h1 onclick: "${this._handleClick}" {
              "Hello World"
            }
            div {
              "My name is: " "${props.name}"
            }
            ${children}
          }
        }
      }
    `;
  },

  _handleClick: function (event, props) {
    console.log('Click h1.');
    
  }
});


console.log(blockml.render(`
  App name: 'myapp', test: 'test' {
    h1 {
      "Hello"
    }
  }
`))