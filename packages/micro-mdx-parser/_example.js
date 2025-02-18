const path = require('path')
const fs = require('fs')
const { inspect } = require('util')
const { parse, stringify, validate } = require('./src')

function deepLog(objOrLabel, logVal) {
  let obj = objOrLabel
  if (typeof objOrLabel === 'string') {
    obj = logVal
    console.log(objOrLabel)
  }
  console.log(inspect(obj, false, null, true))
}

const stringExample = `
Hello, world!
Below is an example of markdown in JSX.

<div style={{padding: '1rem', backgroundColor: 'violet'}}>
  Try and change the background color to.
</div>

<MyComponent isCool />

<img src="w3schools.jpg" alt="W3Schools-img.com" width="104" height="142" />

`

const moreComplexStringExample = `
Hello, world!

Below is an example of markdown in JSX.

**Bold text** next to *italic text* and an example of <u>underlined text</u> & <mark>highlighting</mark> via html tag.

<div style={{
  padding: '1rem', 
  backgroundColor: 'violet'
}}>
  Try and change the background color to.
</div>

<MyComponent isCool={\`
  multi
  line
\`} />

<img src="w3schools.jpg" alt="W3Schools-img.com" width="104" height="142" />

`

const xyz = `
TODO Blog contents here.

TODO Blog contents here.

TODO Blog contents here.

<BlockQuote text={\`contents

contentsxyx

contents\`} author="Author" />
`

const inlineComponentProp = `
<Nested buttonText={\`<span>Niceeee</span>\`} prop='two'>
  check it
</Nested>
`

const inlineComponentPropTwo = `
<Nested buttonText={<span>jsx style</span>} prop='two'>
  check it
</Nested>
`

const inlineComponentPropWithInnerObj = `
<Nested buttonText={<span style={{ color: 'green'}}>jsx style</span>} prop='two'>
  check it
</Nested>
`

const multiLineProps = `
Hello, world!

<div style={{
  padding: '1rem', 
  backgroundColor: 'violet'
}}>
  Try and change the background color to.
</div>

<MyComponent isCool={\`
  multi
  line
\`} />

xyz
`

const conflict = `

<details>
  <summary>Expand code</summary>

\`\`\`graphql
mutation updatePurchaseOrder {
  update_PurchaseOrder(
    id: "<PO_ID>",
    input: {
      expected: "2022-01-03T00:00:00Z"
    }
  ) {
    transaction {
      submissionTime
      transactionId
    }
  }
}
\`\`\`

</details>

## Code inside list inside details

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. 

1. Using the Vendia Share Web Application's GraphQL Explorer of the Supplier's AWS Node, identify a Purchase Order to modify, noting the \`_id\` for one of the Purchase Orders listed for the subsequent step, referred to hereafter as \`<PO_ID>\`

    <details>
      <summary>List Purchase Orders Query</summary>

      This is how you do this query thingie

      1. Xyz
      2. Abc
      3. Lol
    
      \`\`\`graphql
      query listPurchaseOrders {
        list_PurchaseOrderItems {
          _PurchaseOrderItems {
            _id
            _owner
            created
            expected
            fulfilled
            orderId
            updated
            items {
              quantity
              sku
            }
          }
        }
      }
      \`\`\`

      For more information see [google](http://google.com)
    </details>

2. Execute a GraphQL mutation (or use Vendia Share's Entity Explorer to make an equivalent update without any GraphQL) to modify the PO identified in the previous step

    <details>
      <summary>Update Purchase Order Mutation</summary>
    
      \`\`\`graphql
      mutation updatePurchaseOrder {
        update_PurchaseOrder(
          id: "<PO_ID>",
          input: {
            expected: "2022-01-03T00:00:00Z"
          }
        ) {
          transaction {
            submissionTime
            transactionId
            version
          }
        }
      }
      \`\`\`
    </details>


1. Execute a GraphQL mutation (or use Vendia Share's Entity Explorer to make an equivalent update without any GraphQL) to modify the PO identified in the previous step

    Multiple Things 

    <details>
      <summary>Update Purchase Order Mutation</summary>
    
      \`\`\`graphql
      mutation updatePurchaseOrder {
        update_PurchaseOrder(
          id: "<PO_ID>",
          input: {
            expected: "2022-01-03T00:00:00Z"
          }
        ) {
          transaction {
            submissionTime
            transactionId
            version
          }
        }
      }
      \`\`\`
    </details>

    In here

    <details>
      <summary>Update Purchase Order Mutation</summary>
    
      \`\`\`graphql
      mutation updatePurchaseOrder {
        update_PurchaseOrder(
          id: "<PO_ID>",
          input: {
            expected: "2022-01-03T00:00:00Z"
          }
        ) {
          transaction {
            submissionTime
            transactionId
            version
          }
        }
      }
      \`\`\`
    </details>

`

const conflicts = fs.readFileSync(path.resolve(__dirname, 'examples/giant-md/conflicts.md'), 'utf-8')
const conflictsTwp = fs.readFileSync(path.resolve(__dirname, 'examples/giant-md/conflicts-two.md'), 'utf-8')

const x = `
<figure>
  <img src="https://d24nhiikxn5jns.cloudfront.net/optimized/user-images.githubusercontent.com..85032783149620468-736ad5d0-76f0-4553-90ad-29dfbcb76f96.png" />
  <figcaption align="center"><b>Figure 2</b> - <i>Adding a File to Vendia Share</i></figcaption>
</figure>
`

const a = `
<strong>Speaker:</strong>
`

const b = `
<div onClick={() => console.log('hi')}>
  click
</div>

<div onClick={
  () => {
    console.log('hi')
  }
}>
  click
</div>
`

const inlineFn = `
<div 
  onClick={() => {
    console.log('hi')
  }}
>
  click
</div>
`

// console.log(parse(conflicts))
const result = parse(inlineFn)
deepLog(result)

// console.log('result[2].props.onClick', result[3].props)

// const evaluate = function(string) {
//   if (!string) return () => {}
//   return (new Function( 'return (' + string + ')' )());
// }

// const fn = evaluate(result[3].props.onClick)
// console.log('fn', fn)
// if (fn && typeof fn === 'function') {
//   fn()
// }