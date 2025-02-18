const { inspect } = require('util')
const { parse, stringify } = require('../src')

function deepLog(obj) {
  console.log(inspect(obj, {showHidden: false, depth: null, colors: true}))
}

const HTML = `
This is an example of a page with HTML elements with javascript mixed in.

<button onClick={() => alert('hi')} data-lol='true'>
  This is an inline button
</button>


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


Below are some simple HTML elements with inline styles and javascript.

<div id="chill">
  <h2>Cool</h2>
  <div>
    Nice
  </div>
</div>

<style>
#chill {
  background: red;
  color: white;
  padding: 20px;
}
#chill h2 {
  color: yellow;
}
</style>

<script>
document.getElementById('chill').addEventListener('click', () => {
  alert('inline js')
})
</script>

And this is the end of the post.

<form id="custom-form">
  <input type="text" name="name" placeholder='Input stuff' />
  <input type="submit" />
</form>

<script>
// Inline form submit
document.getElementById('custom-form').addEventListener('submit', (e) => {
  e.preventDefault()
  alert('form submitted value: ' + e.target.name.value)
})

console.log("LOAD MY SCRIPT")
</script>

Nice

<script id="lol">
// Make a basic web component and use it in the page
if (!customElements.get('square-letter')) {
  class SquareLetter extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"})
      const div = document.createElement("div")
      div.textContent = \`Hello World! \${Math.random()}\`
      this.shadowRoot.append(div)
    }
  }
  customElements.define("square-letter", SquareLetter)
}
</script>

<p>
  <square-letter />
</p>

<div class='content'>
  <square-letter />
</div>
`

const json = parse(HTML)
console.log('json')
deepLog(json)

const materializedHtml = stringify(json)
console.log('materializedHtml')
console.log(materializedHtml)