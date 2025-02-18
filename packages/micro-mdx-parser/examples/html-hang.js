const { inspect } = require('util')
const { parse, stringify } = require('../src')
const fs = require('fs')
const path = require('path')

function deepLog(obj) {
  console.log(inspect(obj, {showHidden: false, depth: null, colors: true}))
}

const HTML = fs.readFileSync(path.resolve(__dirname, 'giant-md', 'hang.md'), 'utf8')
// const HTML = fs.readFileSync(path.resolve(__dirname, 'giant-md', 'hang-three.md'), 'utf8')

const json = parse(HTML)
console.log('json')
deepLog(json)

// const materializedHtml = stringify(json)
// console.log('materializedHtml')
// console.log(materializedHtml)