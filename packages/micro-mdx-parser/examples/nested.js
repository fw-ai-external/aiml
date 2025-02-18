const { inspect } = require('util')
const { parse, stringify } = require('../src')
const optionsParse = require('oparser').parse

function deepLog(obj) {
  console.log(inspect(obj, {showHidden: false, depth: null, colors: true}))
}

const rawOpts = `
  components={[{
    type: "content",
    content: "Content here...\n\n<Builder\n  components={[{\n    type: \"content\",\n    content: \"Content here... woah nice. Hahahaha\\n\\n<Builder\\n  components={[{ type: "content", content: "Content here... deeeeep woah" }]}\\n/>\"\n  }]}\n/>"
  }]}
`


const x = `  components={[{
    type: "content",
    content: "Content here...
    
<Builder components={[{
  type: \\"content\\",
  content: \\"Content here... woah nice. Hahahaha

  <Builder
    components={[{ 
      type: \\"content\\", 
      content: \\"Content here... deeeeep woah\\" 
    }]}
  />\\"

/>"

  }]}`

const HTML = `
Now

<button>xcool</button>

I can authorxxx with stuff brokjen

<Builder
  components={[{
    type: "content",
    content: "Content here...\n\n<Builder\n  components={[{ type: \"content\", content: \"Content here... woah\" }]}\n/>"
  }]}
/>

<Builder beans=true>cool</Builder>

<OBuilder
  components={[{
    type: "content",
    content: "Content here...\n\n<Builder\n  components={[{\n    type: \"content\",\n    content: \"Content here... woah nice\\n\\n<Builder\\n  components={[{ type: \\\"content\\\", content: \\\"Content here... deeeeep\\\" }]}\\n/>\"\n  }]}\n/>"
  }]}
/>

<MyComponent isCool={\`
multi
line
\`} />

<MyComponentTwoIndents isCool={\`
  multi
  line
\`} more pros=true />

<img src="w3schools.jpg" alt="W3Schools-img.com" width="104" height="142" />

<Bool>cool</Bool>
`

const o = `
<OBuilder
  components={[{
    type: "content",
    content: "Content here...\n\n<Builder\n  components={[{\n    type: \"content\",\n    content: \"Content here... woah nice\\n\\n<Builder\\n  components={[{ type: \\\"content\\\", content: \\\"Content here... deeeeep\\\" }]}\\n/>\"\n  }]}\n/>"
  }]}
/>
`

const broken = `
<Builder
  components={[{
    type: "content",
    content: "Content here...\n\n<Builder\n  components={[{\n    type: \"content\",\n    content: \"Content here... woah nice. Hahahaha\\n\\n<Builder\\n  components={[{ type: "content", content: "Content here... deeeeep woah" }]}\\n/>\"\n  }]}\n/>"
  }]}
/>
`

const stringExample = `
Hello, world!
Below is an example of markdown in JSX.

<div style={{padding: '1rem', backgroundColor: 'violet'}}>
  Try and change the background color to.
</div>

<MyComponent isCool />

<img src="w3schools.jpg" alt="W3Schools-img.com" width="104" height="142" />

`

// const opts = optionsParse(x)
// deepLog(opts)
const json = parse(broken)

// const json = parse(stringExample)
console.log('json')
deepLog(json)

// const materializedHtml = stringify(json)
// console.log('materializedHtml')
// console.log(materializedHtml)
