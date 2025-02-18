const { inspect } = require('util')
const { parse, stringify } = require('../src')

function deepLog(obj) {
  console.log(inspect(obj, {showHidden: false, depth: null, colors: true}))
}

const MD = `
## Typography inside Details

Typography elements in details

\`\`\`graphql
mutation diff {
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

<details>

  <summary>Expand</summary>

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. **Bold integer vitae mauris arcu**, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, italics sodales in blandit ut, placerat quis felis. *Italics vestibulum at sem massa*, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. [Clickable link](https://google.com) mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.

  **Bold text** next to *italic text* and an example of <u>underlined text</u> & <mark>highlighting</mark> via html tag.

  ## List

  - Item One
  - Item Two
  - Item Three
  - Item Four
  - Five

  <img src="https://picsum.photos/300/300">

  # Details Heading 1 with paragraph

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

  ## Details Heading 2 with paragraph

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

  ### Details Heading 3 with paragraph

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

  #### Details Heading 4 with paragraph

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

  ##### Details Heading 5 with paragraph

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

</details>

## Inside lists Details

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
    
      \`\`\`js
      console.log("test")
      const obj =  {
        id: "<PO_ID>",
        input: {
          expected: "2022-01-03T00:00:00Z"
        }
      }
      \`\`\`
    </details>`

const json = parse(MD)
console.log('json')
deepLog(json)

// const materializedMd = stringify(json)
// console.log('materializedMd')
// console.log(materializedMd)