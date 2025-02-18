This page includes the markdown needed for various styles/layouts.

<Button onClick={() => console.log('hi')}>hi</Button>

## Typography

Lorem ipsum dolor sit amet, consectetur adipiscing elit. **Bold integer vitae mauris arcu**, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, italics sodales in blandit ut, placerat quis felis. *Italics vestibulum at sem massa*, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. [Clickable link](https://google.com) mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.

**Bold text** next to *italic text* and an example of <u>underlined text</u> & <mark>highlighting</mark> via html tag.

# Heading 1 with paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, `_id\`dd  d`  sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

## Heading 2 with paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

### Heading 3 with paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

#### Heading 4 with paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

##### Heading 5 with paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.

Headings with no text:

# Heading 1 stacked

## Heading 2 stacked

### Heading 3 stacked

#### Heading 4 stacked

##### Heading 5 stacked

##### Heading 6 stacked

---

# Blockquote

> Blockquotes are very handy in email to emulate reply text.
> This line is part of the same quote.

Quote break.

> This is a very long line that will still be quoted properly when it wraps. Oh boy let's keep writing to make sure this is long enough to actually wrap for everyone. Oh, you can *put* **Markdown** into a blockquote.

---

# Lists

## Ordered List

1. First ordered list item
2. Second ordered list item
3. Third ordered list item
4. Fourth ordered list item

## Unordered List

- Item One
- Item Two
- Item Three
- Item Four

## Ordered List with children

1. Item one
    1. Ordered list child 1
    2. Ordered list child 2
2. Item two
    1. Ordered list child one
    2. Ordered list child two
        1. grandchildren one
        2. grandchildren two
        3. grandchildren three
3. Item with unordered children
    - One
    - Two

## Unordered List with children

- Item One
- Item Two
- Item Four with children
  - child 1
  - child 2
  - child 3
  - child 4 with children
    - grandchild one
    - grandchild two
- Item Five with children
  1. child 1
  2. child 2
    - unordered child 1
    - unordered child 2
    - unordered child 3 with children
      - grandchild one
      - grandchild two
- Last item

## Nested Mixed List

- Item
  1. First Sub-item
  2. Second Sub-item

* **Bold Text**. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.

* **Nested list with paragraph**. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.
    * list item 1
    * list item 2
    * list item 3
    * list item long Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper.

* **Nested ordered list with paragraph**. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.
    1. list item 1
    2. list item 2
    3. list item 3
    4. list item long Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper.

---

# Collapsable Details

Using the details tag to collapse contents.

```html
<details>
  <summary>Preview text of details</summary>
  Contents
</details>
```

<details>
  <summary>Preview text of details</summary>

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.
</details>

---

## Stacked Details

Details stacked on each other

<details>
  <summary>Preview text of details 1</summary>

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.
</details>

<details>
  <summary>Preview text of details 2</summary>

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.
</details>

<details>
  <summary>Preview text of details 3</summary>

  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.
</details>

---

## Inside lists Details

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. 

1. Using the Vendia Share Web Application's GraphQL Explorer of the Supplier's AWS Node, identify a Purchase Order to modify, noting the `_id` for one of the Purchase Orders listed for the subsequent step, referred to hereafter as PO_ID

    <details>
      <summary>List Purchase Orders Query</summary>
    
      ```graphql
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
      ```
    </details>

1. Execute a GraphQL mutation (or use Vendia Share's Entity Explorer to make an equivalent update without any GraphQL) to modify the PO identified in the previous step

    <details>
      <summary>Update Purchase Order Mutation</summary>
    
      ```graphql
      mutation updatePurchaseOrder {
        update_PurchaseOrder(
          id: "PO_ID",
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
      ```
    </details>


1. Execute a GraphQL mutation (or use Vendia Share's Entity Explorer to make an equivalent update without any GraphQL) to modify the PO identified in the previous step

    Multiple Things 

    <details>
      <summary>Update Purchase Order Mutation</summary>
    
      ```graphql
      mutation updatePurchaseOrder {
        update_PurchaseOrder(
          id: "PO_ID",
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
      ```
    </details>

    In here

    <details>
      <summary>Update Purchase Order Mutation</summary>
    
      ```graphql
      mutation updatePurchaseOrder {
        update_PurchaseOrder(
          id: "PO_ID",
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
      ```
    </details>


---

## Large Details

<details>
  <summary>Node.js usage</summary>

  For ES6/7 javascript you can `import Analytics from 'analytics'` for normal node.js usage you can import like so:

  ```js
  const { Analytics } = require('analytics')
  // or const Analytics = require('analytics').default

  const analytics = Analytics({
    app: 'my-app-name',
    version: 100,
    plugins: [
      googleAnalyticsPlugin({
        trackingId: 'UA-121991291',
      }),
      customerIOPlugin({
        siteId: '123-xyz'
      })
    ]
  })

  // Fire a page view
  analytics.page()
  ```

</details>

<details>
  <summary>Browser usage</summary>

  When importing global `analytics` into your project from a cdn the library is expose via a global `_analytics` variable.

  Call `_analytics.init` to create an analytics instance.

  ```html
  <script src="https://unpkg.com/analytics/dist/analytics.min.js"></script>
  <script>
    const Analytics = _analytics.init({
      app: 'my-app-name',
      version: 100,
      ...plugins
    })

    Analytics.track()

    // optionally expose to window
    window.Analytics = Analytics
  </script>
  ```

</details>

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio.

---

# Tables

## Markdown Table

| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned | $1600 |
| col 2 is      | centered      |   $12 |
| zebra stripes | are neat      |    $1 |

<details>
  <summary>Table markdown snippet</summary>

  ```md
  | Tables        | Are           | Cool  |
  | ------------- |:-------------:| -----:|
  | col 3 is      | right-aligned | $1600 |
  | col 2 is      | centered      |   $12 |
  | zebra stripes | are neat      |    $1 |
  ```
</details>

---

## HTML Table

<table>
  <tr>
    <th>Company</th>
    <th>Contact</th>
    <th>Country</th>
  </tr>
  <tr>
    <td>Alfreds Futterkiste</td>
    <td>Maria Anders</td>
    <td>Germany</td>
  </tr>
  <tr>
    <td>Centro comercial Moctezuma</td>
    <td>Francisco Chang</td>
    <td>Mexico</td>
  </tr>
</table>

<details>
  <summary>HTML table snippet</summary>

  ```html
  <table>
    <tr>
      <th>Company</th>
      <th>Contact</th>
      <th>Country</th>
    </tr>
    <tr>
      <td>Alfreds Futterkiste</td>
      <td>Maria Anders</td>
      <td>Germany</td>
    </tr>
    <tr>
      <td>Centro comercial Moctezuma</td>
      <td>Francisco Chang</td>
      <td>Mexico</td>
    </tr>
  </table>
  ```
</details>

## Table with inline markdown styles

<div style={{"overflowX": "auto"}}>

| Inline | Markdow | In  | Table  |
| ----------| -------- | ----------------- | ------ |
| _italics_ | **bold** | ~~strikethrough~~ | `code` |

</div>

<details>
  <summary>Table with inline markdown styles snippet</summary>

  ```md
  | Inline | Markdow | In  | Table  |
  | ----------- | ------------ | ----------------- | ------ |
  | _italics_   | **bold**     | ~~strikethrough~~ | `code` |
  ```
</details>

## Larger HTML table

<table>
  <tr>
    <th>Decentralized</th>
    <th>Real-time</th>
    <th>Consistent</th>
    <th>Ledgered</th>
    <th>Access controlled</th>
  </tr>
  <tr>
    <td>Low</td>
    <td>Medium</td>
    <td>Medium</td>
    <td>Medium</td>
    <td>High</td>
  </tr>
  <tr>
    <td>
      These solutions have similar drawbacks to the traditional <a href="https://www.oreilly.com/radar/microservices-adoption-in-2020/">“monolithic” architectures</a>.
    </td>
    <td>Many of these hubs utilize connectors to connect to platforms continuously.</td>
    <td>There is no general consensus across participants.</td>
    <td>Often the hub does not have change logs for the data.</td>
    <td>The hub itself collects all the data and we can set up limited access to that data.</td>
  </tr>
</table>

---

# Code

Below are different examples of how to use code and syntax highlighting.

## Inline Code

For inline code blocks, wrap your code in backticks: \`const myCode = "isGreat"\`. This will be rendered as follows: `const myCode = "isGreat"`.

## Code blocks

For code blocks that allows multiple lines, syntax highlighting, line numbers and line highlighting, use triple backticks for code fencing: ```.

Javascript example:

```javascript
const s = "JavaScript syntax highlighting"
alert(s)
```

<details>
  <summary>Javascript code markdown</summary>

  ````md
  ```javascript
  const s = "JavaScript syntax highlighting"
  alert(s)
  ```
  ````
</details>

JSON example:

```json
{
  "data": {
    "list_Blocks": {
      "_Blocks": [{
        "BlockId": "000000000000001",
        "BlockContentHash": "48d47e9b5e9f93b6074b17",
        "PreviousBlockId": "000000000000000",
      }]
    }
  }
}
```

<details>
  <summary>JSON code markdown</summary>

  ````md
  ```json
  {
    "data": {
      "list_Blocks": {
        "_Blocks": [{
          "BlockId": "000000000000001",
          "BlockContentHash": "48d47e9b5e9f93b6074b17",
          "PreviousBlockId": "000000000000000",
        }]
      }
    }
  }
  ```
  ````
</details>


Python example:

```python
s = "Python syntax highlighting"
print s
```

<details>
  <summary>Python code markdown</summary>

  ````md
  ```python
  s = "Python syntax highlighting"
  print s
  ```
  ````
</details>

Bash example:

```bash
npm run build
```

<details>
  <summary>Bash code markdown</summary>

  ````md
  ```bash
  npm run build
  ```
  ````
</details>

CSS example:

```css
body {
  color: blue;
}
.blur {
  filter: blur(4px);
}
```

<details>
  <summary>CSS code markdown</summary>

  ````md
  ```css
  body {
    color: blue;
  }
  .blur {
    filter: blur(4px);
  }
  ```
  ````
</details>

If language is omitted the code blocks will look like this:

```
No language indicated, so no syntax highlighting.
But let's throw in a <b>tag</b>.
```

## Wide code example

A very wide code snippet

```js
import Analytics from 'analyticsskajldalkdalksdjalkddlaksjdlsakjdlkasjdlksajdlakjdlkasjdlkasjdlkajsdlkajdlkjalksdjalkdjalkdjalkdjaslkdjaslkjdlkasjdlaskdjalkalksjalkjasdlkadjas'
import googleAnalyticsPlugin from '@analytics/google-analytics'
import customerIOPlugin from '@analytics/customerio'
```

## Code Tutorial Example

Install the pakcage via npm

```bash
npm install analytics --save
```

Or include as a script tag:

```html
<script src="https://unpkg.com/analytics/dist/analytics.min.js"></script>
```

Then in your application, use the package like this:

```js
import Analytics from 'analytics'
import googleAnalyticsPlugin from '@analytics/google-analytics'
import customerIOPlugin from '@analytics/customerio'

/* Initialize analytics */
const analytics = Analytics({
  app: 'my-app-name',
  version: 100,
  plugins: [
    googleAnalyticsPlugin({
      trackingId: 'UA-121991291',
    }),
    customerIOPlugin({
      siteId: '123-xyz'
    })
  ]
})

/* Track a page view */
analytics.page()
```

---

# Layouts

## Full width layout

<div>
  Full width content in a div. If elements are `span` or `div` they will stretch full width. 
  Praesent fringilla ornare ullamcorper.
  Pellentesque diam orci, sodales in blandit ut, placerat quis felis.
  Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio.
  Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.
  Suspendisse potenti. Quisque eget massa a massa semper mollis.
  Full width content in a div. If elements are `span` or `div` they will stretch full width. 
  Praesent fringilla ornare ullamcorper.
  Pellentesque diam orci, sodales in blandit ut, placerat quis felis.
  Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio.
  Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna.
  Suspendisse potenti. Quisque eget massa a massa semper mollis.
</div>

---

# Images

### Left alignment

<img align="left" width="100" height="100" src="https://www.fillmurray.com/100/100" />

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.

**Left alignment snippet:**

```html
<img align="left" width="100" height="100" src="https://www.fillmurray.com/100/100" />
```

---

### Right alignment

<p>
  <img align="right" width="100" height="100" src="https://www.fillmurray.com/100/100" />
</p>

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.

**Right alignment snippet:**

```html
<p>
  <img align="right" width="100" height="100" src="https://www.fillmurray.com/100/100" />
</p>
```

---

### Center alignment

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat. Vivamus vitae mi ligula, non hendrerit urna. Suspendisse potenti. Quisque eget massa a massa semper mollis.

<p align="center">
  <img width="460" height="300" src="https://www.fillmurray.com/460/300" />
</p>

**Center alignment snippet:**

```html
<p align="center">
  <img width="460" height="300" src="https://www.fillmurray.com/460/300" />
</p>
```

---

### Full width image

<img width="100%" height="500" src="https://www.fillmurray.com/1400/500" />

**Full width image snippet:**

```html
<img width="100%" height="500" src="https://www.fillmurray.com/1400/500" />
```

---

### Figure

Figure with caption

```html
<figure>
  <img src="https://d24nhiikxn5jns.cloudfront.net/optimized/user-images.githubusercontent.com..85032783147981825-f0e94c34-6488-4fd3-82f4-7ef8e00224a2.png" />
  <figcaption><b>Figure 1</b> - <i>A Supplier, Distributor, and Retailer reacting in real-time across clouds as changes to purchase orders occur</i></figcaption>
</figure>
```

<figure>
  <img src="https://d24nhiikxn5jns.cloudfront.net/optimized/user-images.githubusercontent.com..85032783147981825-f0e94c34-6488-4fd3-82f4-7ef8e00224a2.png" />
  <figcaption><b>Figure 1</b> - <i>A Supplier, Distributor, and Retailer reacting in real-time across clouds as changes to purchase orders occur</i></figcaption>
</figure>

#### Stacked figure captions

<figure>
  <img src="https://d24nhiikxn5jns.cloudfront.net/optimized/user-images.githubusercontent.com..85032783149620468-736ad5d0-76f0-4553-90ad-29dfbcb76f96.png" />
  <figcaption align="center"><b>Figure 1</b> - <i>Adding a File to Vendia Share</i></figcaption>
</figure>

<figure>
  <img src="https://d24nhiikxn5jns.cloudfront.net/optimized/user-images.githubusercontent.com..85032783149620475-8f95b5b8-9135-461e-9d73-c16c7b7b4b61.png" />
  <figcaption align="center"><b>Figure 2</b> - <i>Viewing File History in Vendia Share</i></figcaption>
</figure>

# Embeds

## Twitter

<blockquote className="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">We're launching 🚀 AWS AppSync as a new service for preview later today! Here are some of its features! <a href="https://twitter.com/apatel72001?ref_src=twsrc%5Etfw">@apatel72001</a> <a href="https://twitter.com/hashtag/reInvent?src=hash&amp;ref_src=twsrc%5Etfw">#reInvent</a> <a href="https://t.co/fG9thG6sAa">pic.twitter.com/fG9thG6sAa</a></p>&mdash; AWS re:Invent (@AWSreInvent) <a href="https://twitter.com/AWSreInvent/status/935573868260896768?ref_src=twsrc%5Etfw">November 28, 2017</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charSet="utf-8"></script>

## Youtube

<iframe width="560" height="315" src="https://www.youtube.com/embed/9bZkp7q19f0" frameBorder="0" allowFullScreen></iframe>

## Video

<video controls name="create-api-key" width="750">
  <source src="https://user-images.githubusercontent.com/95232537/164252013-b0d70ae8-eb34-473f-bf0c-eaf62405c8bc.mp4" type="video/mp4"></source>
</video>

---

# HTML

## Internal Link

<a href='/'>Internal link</a>

## External Link

<a href='https://google.com'>External link</a>

## Anchor Scroll Link

<a href='#heading-1-with-paragraph'>Anchor scroll link</a>

Lorem ipsum dolor sit amet, consectetur adipiscing elit. <a href='/'>Internal link</a> Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. Pellentesque diam orci, sodales in blandit ut, placerat quis felis. Vestibulum at sem massa, <a href='https://google.com'>External link</a> in tempus nisi. Vivamus ut fermentum odio. Etiam porttitor faucibus volutpat.

<div className='content'>
  custom div
</div>

<div className='content'>
  <p>Paragraph text in custom div</p>
</div>

<div className='content'>
  <ul>
    <li>Coffee</li>
    <li>Tea</li>
    <li>Milk</li>
  </ul>
</div>

<div className='content'>
  <ol>
    <li>Coffee</li>
    <li>Tea</li>
    <li>Milk</li>
  </ol>
</div>

<div className='content'>
  <img src="https://www.fillmurray.com/300/300" />
</div>

<u>Underlined text</u>

## Other Elements 

### abbr, sub, sup, kbd, mark

<p>
  <abbr title="Graphics Interchange Format">GIF</abbr> is a bitmap image format.
</p>

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

Press <kbd><kbd>CTRL</kbd>+<kbd>ALT</kbd>+<kbd>Delete</kbd></kbd> to end the session.

Most <mark>salamanders</mark> are nocturnal, and hunt for insects, worms, and other small creatures.