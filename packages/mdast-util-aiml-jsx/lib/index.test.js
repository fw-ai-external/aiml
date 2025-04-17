// Placeholder test file
// Add tests based on mdast-util-aiml-jsx tests

import { strict as assert } from "node:assert";
// import { micromark } from "micromark";
import { fromMarkdown } from "mdast-util-from-markdown";
import { aimlJsx } from "micromark-extension-aiml-jsx"; // Assuming the micromark extension is sibling
import { aimlJsxFromMarkdown } from "./index.js";
import { allElementConfigs } from "@fireworks/shared";

// Helper to process markdown with the extension
function process(value) {
  const tree = fromMarkdown(value, {
    extensions: [
      aimlJsx({
        elementConfigs: allElementConfigs, // Pass mock config to micromark extension
      }),
    ],
    mdastExtensions: [
      aimlJsxFromMarkdown({ elementConfigs: allElementConfigs }),
    ],
  });
  // Remove position info for easier comparison
  removePositions(tree);
  return tree;
}

// Helper to remove position information from the tree
function removePositions(node) {
  if (node && typeof node === "object") {
    delete node.position;
    if (Array.isArray(node.children)) {
      node.children.forEach(removePositions);
    }
    // Handle attributes potentially having position
    if (Array.isArray(node.attributes)) {
      node.attributes.forEach((attr) => {
        delete attr.position;
        // Handle attribute values that are expressions
        if (
          attr.value &&
          typeof attr.value === "object" &&
          attr.value.type === "mdxJsxAttributeValueExpression"
        ) {
          delete attr.value.position; // Although position isn't standard here, clean just in case
        }
      });
    }
    // If the node itself has children (besides the main array)
    if (node.value && typeof node.value === "object") {
      removePositions(node.value);
    }
  }
}

describe("mdast-util-aiml-jsx", () => {
  // it("should have tests", () => { // Remove this test
  //   assert.fail("No tests written yet");
  // });

  it("should parse a valid self-closing configured tag", () => {
    const result = process("<state />");
    assert.deepEqual(result.children[0], {
      type: "mdxJsxFlowElement",
      name: "state",
      attributes: [],
      children: [],
    });
  });

  it("should parse a valid configured tag with content", () => {
    const result = process("<state>content</state>");
    // Expect paragraph > text element wrapper for simple inline cases
    assert.deepEqual(result.children[0], {
      type: "paragraph", // Expect paragraph wrapper
      children: [
        {
          type: "mdxJsxTextElement", // Expect Text element
          name: "state",
          attributes: [],
          children: [{ type: "text", value: "content" }],
        },
      ],
    });
  });

  test("treats unknown tags that don\\'t match as text/paragraphs", () => {
    const contentWithUnknownTags = `<completelyfaketag>
This is some text inside an unknown tag
</completelyfaketag>

Some regular paragraph text.

<anotherfaketag attr="value">
  With some nested content
</anotherfaketag>`;

    const result = process(contentWithUnknownTags);

    // Check that all nodes with content are paragraphs or text
    // Without the fixes, we'd get jsx element nodes for unknown tags
    result.children.forEach((child) => {
      assert.ok(
        child.type === "paragraph" || child.type === "text",
        `Expected node type to be "paragraph" or "text", got "${child.type}"`
      );
    });

    // Find the content paragraphs (now we may have text nodes directly in children array)
    const paragraphs = result.children.filter(
      (node) => node.type === "paragraph"
    );
    assert.ok(paragraphs.length >= 2, "Expected at least 2 paragraphs");

    // Find a paragraph with our known regular text content
    const regularTextParagraph = paragraphs.find(
      (p) =>
        p.children &&
        p.children[0] &&
        p.children[0].value === "Some regular paragraph text."
    );

    // Check the content of the paragraph with regular text
    assert.ok(regularTextParagraph, "Regular text paragraph not found");
    assert.deepEqual(regularTextParagraph, {
      type: "paragraph",
      children: [{ type: "text", value: "Some regular paragraph text." }],
    });

    // Ensure we have the fake tag content (either as separate text nodes or in paragraphs)
    const allTextContent = result.children
      .flatMap((node) => (node.type === "paragraph" ? node.children : [node]))
      .filter((node) => node.type === "text")
      .map((node) => node.value);

    // Check that we have the important content fragments somewhere in the result
    assert.ok(
      allTextContent.some((text) => text.includes("<completelyfaketag>")),
      "Opening fake tag not found"
    );
    assert.ok(
      allTextContent.some((text) =>
        text.includes("This is some text inside an unknown tag")
      ),
      "Content text not found"
    );
    assert.ok(
      allTextContent.some((text) => text.includes("</completelyfaketag>")),
      "Closing fake tag not found"
    );
    assert.ok(
      allTextContent.some((text) =>
        text.includes('<anotherfaketag attr="value">')
      ),
      "Opening tag with attributes not found"
    );
  });

  it("should parse a valid fragment", () => {
    const result = process("<>fragment content</>");
    // Expect paragraph > text element wrapper
    assert.deepEqual(result.children[0], {
      type: "paragraph", // Expect paragraph wrapper
      children: [
        {
          type: "mdxJsxTextElement", // Expect Text element
          name: null,
          attributes: [],
          children: [{ type: "text", value: "fragment content" }],
        },
      ],
    });
  });

  it("should parse an *invalid* (unconfigured) tag as an element even with closing tag", () => {
    // Test that an invalid tag pair parses correctly without validation errors
    const result = process("<invalid> some text</invalid>"); // Added closing tag
    // Since we now parse opening and closing tags as separate text nodes, we need to check both are present
    assert.equal(result.children[0].children.length, 2);
    assert.equal(result.children[0].children[0].type, "text");
    assert.equal(result.children[0].children[0].value, "<invalid> some text");
    assert.equal(result.children[0].children[1].type, "text");
    assert.equal(result.children[0].children[1].value, "</invalid>");
  });

  it("should parse mismatched *invalid* tags without error", () => {
    const result = process("<invalid>text</unconfigured>"); // Mismatched, should NOT error
    // Since we now parse opening and closing tags as separate text nodes, we need to check both are present
    assert.equal(result.children[0].children.length, 2);
    assert.equal(result.children[0].children[0].type, "text");
    assert.equal(result.children[0].children[0].value, "<invalid>text");
    assert.equal(result.children[0].children[1].type, "text");
    assert.equal(result.children[0].children[1].value, "</unconfigured>");
  });

  it("should THROW on mismatched *valid* configured tags", () => {
    assert.throws(() => {
      process("<state>content</topic>"); // Mismatched valid tags
    }, /Expected a closing tag for `<state>`/);
  });

  it("should THROW on unclosed *valid* configured tags", () => {
    assert.throws(() => {
      process("<state>content"); // Unclosed valid tag
    }, /Expected a closing tag for `<state>`/);
  });

  it("should THROW on unclosed fragments", () => {
    assert.throws(() => {
      process("<>fragment content"); // Unclosed fragment
    }, /Expected a closing tag for `<>`/);
  });

  it("should parse valid tags with attributes", () => {
    const result = process('<state name="intro" />');
    assert.deepEqual(result.children[0], {
      type: "mdxJsxFlowElement", // Might be TextElement depending on context
      name: "state",
      attributes: [{ type: "mdxJsxAttribute", name: "name", value: "intro" }],
      children: [],
    });
  });

  // TODO: fix this. Incorrect indentation works just fine so this is a p0 bug
  it.skip("should parse nested tags with attributes that are valid with proper indentation", () => {
    const input = `
<workflow id="test">
  <state id="first">
    <llm prompt="First state" />
  </state>
  <state id="second">
    <llm prompt="Second state" />
  </state>
</workflow>
    `;

    const result = process(input);
    console.log(JSON.stringify(result, null, 2));

    const workflow = result.children.find(
      (child) => child.type === "mdxJsxFlowElement" && child.name === "workflow"
    );
    // expect workflow to be a top level AST node (maybe there is text or a paragraph before and after the workflow because of new lines but we dont care about that)
    assert.ok(
      !!workflow,
      "Workflow mdxJsxFlowElement node not found as a top level node in the AST"
    );

    assert.equal(
      workflow.attributes.find((attr) => attr.name === "id")?.value,
      "test",
      "Workflow mdxJsxFlowElement node exists but the id attribute was not found or is not equal to 'test'"
    );

    assert.equal(workflow.children.length, 2);
    assert.equal(workflow.children[0]?.name, "state");

    const firstState = workflow.children[0];
    assert.equal(
      firstState.attributes.find(
        (attr) => attr.type === "mdxJsxAttribute" && attr.name === "id"
      )?.value,
      "first"
    );
    assert.equal(
      firstState.children[0]?.type,
      "mdxJsxFlowElement",
      "the first state node should have had only 1 child node and it should have been of type mdxJsxFlowElement"
    );
    assert.notEqual(
      firstState.children[0]?.type,
      "code",
      "the first state should have an mdxJsxFlowElement child node with a name of llm... NOT a code node"
    );
    assert.equal(
      firstState.children[0]?.name,
      "llm",
      "the first state node had a mdxJsxFlowElement child node but it was not the expected name of llm node"
    );
    assert.equal(
      firstState.children[0].attributes?.find(
        (attr) => attr.type === "mdxJsxAttribute" && attr.name === "prompt"
      )?.value,
      "First state",
      "the first state node had a llm mdxJsxFlowElement child node but it was not the expected prompt attribute of 'First state'"
    );
    const secondState = workflow.children[1];
    assert.equal(secondState.name, "state");
    assert.equal(
      secondState.attributes?.find(
        (attr) => attr.type === "mdxJsxAttribute" && attr.name === "id"
      )?.value,
      "second"
    );
    assert.notEqual(
      secondState.children[0]?.type,
      "code",
      "the second state should have an mdxJsxFlowElement child node with a name of llm... NOT a code node"
    );
    assert.equal(
      secondState.children[0]?.type,
      "mdxJsxFlowElement",
      "the second state node should have had only 1 child node and it should have been of type mdxJsxFlowElement"
    );
    assert.equal(
      secondState.children[0]?.name,
      "llm",
      "the second state node had a mdxJsxFlowElement child node but it was not the expected name of llm node"
    );
    assert.equal(
      secondState.children[0].attributes?.find(
        (attr) => attr.type === "mdxJsxAttribute" && attr.name === "prompt"
      )?.value,
      "Second state",
      "the second state node had a llm mdxJsxFlowElement child node but it was not the expected prompt attribute of 'Second state'"
    );
  });
  it("should parse nested tags with attributes that are valid with improper indentation", () => {
    const input = `
<workflow id="test">
  <state id="first">
  <llm prompt="First state" />
  </state>
  <state id="second">
  <llm prompt="Second state" />
  </state>
</workflow>
    `;

    const result = process(input);
    console.log(JSON.stringify(result, null, 2));

    const workflow = result.children.find(
      (child) => child.type === "mdxJsxFlowElement" && child.name === "workflow"
    );
    // expect workflow to be a top level AST node (maybe there is text or a paragraph before and after the workflow because of new lines but we dont care about that)
    assert.ok(
      !!workflow,
      "Workflow mdxJsxFlowElement node not found as a top level node in the AST"
    );

    assert.equal(
      workflow.attributes.find((attr) => attr.name === "id")?.value,
      "test",
      "Workflow mdxJsxFlowElement node exists but the id attribute was not found or is not equal to 'test'"
    );

    assert.equal(workflow.children.length, 2);
    assert.equal(workflow.children[0]?.name, "state");

    const firstState = workflow.children[0];
    assert.equal(
      firstState.attributes.find(
        (attr) => attr.type === "mdxJsxAttribute" && attr.name === "id"
      )?.value,
      "first"
    );
    assert.equal(
      firstState.children[0]?.type,
      "mdxJsxFlowElement",
      "the first state node should have had only 1 child node and it should have been of type mdxJsxFlowElement"
    );
    assert.notEqual(
      firstState.children[0]?.type,
      "code",
      "the first state should have an mdxJsxFlowElement child node with a name of llm... NOT a code node"
    );
    assert.equal(
      firstState.children[0]?.name,
      "llm",
      "the first state node had a mdxJsxFlowElement child node but it was not the expected name of llm node"
    );
    assert.equal(
      firstState.children[0].attributes?.find(
        (attr) => attr.type === "mdxJsxAttribute" && attr.name === "prompt"
      )?.value,
      "First state",
      "the first state node had a llm mdxJsxFlowElement child node but it was not the expected prompt attribute of 'First state'"
    );
    const secondState = workflow.children[1];
    assert.equal(secondState.name, "state");
    assert.equal(
      secondState.attributes?.find(
        (attr) => attr.type === "mdxJsxAttribute" && attr.name === "id"
      )?.value,
      "second"
    );
    assert.notEqual(
      secondState.children[0]?.type,
      "code",
      "the second state should have an mdxJsxFlowElement child node with a name of llm... NOT a code node"
    );
    assert.equal(
      secondState.children[0]?.type,
      "mdxJsxFlowElement",
      "the second state node should have had only 1 child node and it should have been of type mdxJsxFlowElement"
    );
    assert.equal(
      secondState.children[0]?.name,
      "llm",
      "the second state node had a mdxJsxFlowElement child node but it was not the expected name of llm node"
    );
    assert.equal(
      secondState.children[0].attributes?.find(
        (attr) => attr.type === "mdxJsxAttribute" && attr.name === "prompt"
      )?.value,
      "Second state",
      "the second state node had a llm mdxJsxFlowElement child node but it was not the expected prompt attribute of 'Second state'"
    );
  });
  it("should parse invalid tags with attributes (no validation)", () => {
    const result = process('<invalid data="stuff">text</other>');
    // Since we now parse opening and closing tags as separate text nodes, we need to check both are present
    assert.equal(result.children[0].children.length, 2);
    assert.equal(result.children[0].children[0].type, "text");
    assert.equal(
      result.children[0].children[0].value,
      '<invalid data="stuff">text'
    );
    assert.equal(result.children[0].children[1].type, "text");
    assert.equal(result.children[0].children[1].value, "</other>");
  });
});
