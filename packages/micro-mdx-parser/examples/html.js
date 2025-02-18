const { inspect } = require('util')
const { parse, stringify } = require('../src')

function deepLog(obj) {
  console.log(inspect(obj, {showHidden: false, depth: null, colors: true}))
}

const HTML = `
<p>
  <a href="/html/tutorial/html_links.cfm">Basic Link</a>
</p>

<ol>
  <li>List item 1</li>
  <li>List item 2</li>
  <li>List item 3</li>
</ol>

<table>
  <tr>
    <th>Table header</th>
    <th>Table header</th>
  </tr>
  <tr>
    <td>Table cell 1</td>
    <td>Table cell 2</td>
  </tr>
</table>
`

const json = parse(HTML)
console.log('json')
deepLog(json)

const materializedHtml = stringify(json)
console.log('materializedHtml')
console.log(materializedHtml)