For code blocks that allows multiple lines, syntax highlighting, line numbers and line highlighting, use triple backticks for code fencing: ```.

HTML code snippet

```html
<p align="center">
  <img width="460" height="300" src="https://picsum.photos/460/300" />
  what
</p>
```

Javascript code snippet

```javascript
console.log('test')
```

Markdown

````md
# Test

text

## Test

text
````

## Code in details

Examples of code in `details`

<details>
  <summary>Expand code</summary>

```graphql
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
```

</details>

Examples of code with description in `details`

<details>
  <summary>Expand code</summary>

This code does xyz.

```js
const s = "JavaScript syntax highlighting"
alert(s)
```

</details>

## Escaped Code in details

Javascript example:

```javascript
const s = "JavaScript syntax highlighting"
alert(s)
```

<details>
  <summary>Javascript code markdown</summary>

  ````
  ```javascript
  const s = "indented JavaScript syntax highlighting"
  alert(s)
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

## Four tick box

Using 4 backticks (<code>````</code>) ticks

````md
Four tick box
````

## Options

No highlight

````md noHighlight
```javascript
console.log('test')
```
````

## Code inside lists

1. List item one

    ```js
    const s = "custom code"
    alert(s)
    ```

2. List item two

    ```js
    alert(s)
    ```

3. List item three


---

## Code inside list inside details

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae mauris arcu, eu pretium nisi. Praesent fringilla ornare ullamcorper. 

1. Using the Vendia Share Web Application's GraphQL Explorer of the Supplier's AWS Node, identify a Purchase Order to modify, noting the `_id` for one of the Purchase Orders listed for the subsequent step, referred to hereafter as `<PO_ID>`

    <details>
      <summary>List Purchase Orders Query</summary>

      This is how you do this query thingie

      1. Xyz
      2. Abc
      3. Lol
    
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

      For more information see [google](http://google.com)
    </details>

2. Execute a GraphQL mutation (or use Vendia Share's Entity Explorer to make an equivalent update without any GraphQL) to modify the PO identified in the previous step

    <details>
      <summary>Update Purchase Order Mutation</summary>
    
      ```graphql
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
      ```
    </details>


1. Execute a GraphQL mutation (or use Vendia Share's Entity Explorer to make an equivalent update without any GraphQL) to modify the PO identified in the previous step

    Multiple Things 

    <details>
      <summary>Update Purchase Order Mutation</summary>
    
      ```graphql
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
      ```
    </details>

    In here

    <details>
      <summary>Update Purchase Order Mutation</summary>
    
      ```graphql
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
      ```
    </details>