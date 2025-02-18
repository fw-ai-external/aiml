const { inspect } = require('util')
const { parse, stringify } = require('../src')

function deepLog(obj) {
  console.log(inspect(obj, {showHidden: false, depth: null, colors: true}))
}

const HTML = `
Here is another button that prompts a confirm dialog

<button onClick={() => {
  const userConfirmed = confirm('Are you sure you want to proceed?')
  
  if (userConfirmed) {
    console.log('User clicked OK')
  } else {
    console.log('User clicked Cancel')
  }
}}>
  Confirm or Deny
</button>
`

const json = parse(HTML)
console.log('json')
deepLog(json)

const materializedHtml = stringify(json)
console.log('materializedHtml')
console.log(materializedHtml)