const fs = require('fs')
const path = require('path')
const { inspect } = require('util')
const { parse, stringify } = require('../../src')

function deepLog(obj) {
  console.log(inspect(obj, {showHidden: false, depth: null, colors: true}))
}

function getTextBetweenChars(text, start, end) {
  return text.slice(start, end)
}
let json
let MD
MD = fs.readFileSync(path.join(__dirname, 'giant.md'), 'utf-8')
MD = fs.readFileSync(path.join(__dirname, 'smaller.md'), 'utf-8')
// const MD = fs.readFileSync(path.join(__dirname, 'inline-code.md'), 'utf-8')
// const MD = fs.readFileSync(path.join(__dirname, 'images.md'), 'utf-8')
//json = parse(`<Button onClick={{() => console.log('hi')}}>hi</Button>`)
json = parse(MD)
console.log('json')
deepLog(json)
//*
// fs.writeFileSync(path.join(__dirname, 'out.json'), JSON.stringify(json, null, 2))
/** */

const match = '`const myCode = "isGreat"`'
const start = 68
const end = 121
console.log(`"${getTextBetweenChars(MD, start, end)}"`)

// const materializedMd = stringify(json)
// console.log('materializedMd')
// console.log(materializedMd)