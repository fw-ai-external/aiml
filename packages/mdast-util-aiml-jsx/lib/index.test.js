// Placeholder test file
// Add tests based on mdast-util-mdx-jsx tests

import { strict as assert } from "node:assert";
// import { micromark } from "micromark";
import { fromMarkdown } from "mdast-util-from-markdown";
import { aimlJsx } from "micromark-extension-aiml-jsx"; // Assuming the micromark extension is sibling
import { aimlJsxFromMarkdown } from "./index.js";

// --- Mock Configuration ---
// TODO: Replace with actual import or setup if your config is complex
const allElementConfigs = {
  state: {},
  topic: {},
  category: {},
  // Add other valid tags here based on your actual config
};
// --- End Mock ---

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
    assert.deepEqual(result.children[0], {
      type: "paragraph", // Expect paragraph wrapper
      children: [
        {
          type: "mdxJsxTextElement", // Expect Text element
          name: "invalid",
          attributes: [],
          children: [{ type: "text", value: " some text" }], // Content is processed
        },
      ],
    });
  });

  it("should parse mismatched *invalid* tags without error", () => {
    const result = process("<invalid>text</unconfigured>"); // Mismatched, should NOT error
    assert.deepEqual(result.children[0], {
      type: "paragraph", // Expect paragraph wrapper
      children: [
        {
          type: "mdxJsxTextElement", // Expect Text element
          name: "invalid",
          attributes: [],
          children: [{ type: "text", value: "text" }], // Expect processed content, not raw string
        },
        // The closing tag might appear as text depending on micromark handling
        // We don't assert on the closing tag part as its handling is outside this util's scope
      ],
    });
  });

  it("should THROW on mismatched *valid* configured tags", () => {
    assert.throws(() => {
      process("<state>content</topic>"); // Mismatched valid tags
    }, /Unexpected closing tag `<\/topic>`, expected corresponding closing tag for `<state>`/);
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

  it("should parse invalid tags with attributes (no validation)", () => {
    const result = process('<invalid data="stuff">text</other>');
    assert.deepEqual(result.children[0], {
      type: "paragraph", // Expect paragraph wrapper
      children: [
        {
          type: "mdxJsxTextElement", // Expect Text element
          name: "invalid",
          attributes: [
            { type: "mdxJsxAttribute", name: "data", value: "stuff" },
          ],
          children: [{ type: "text", value: "text" }],
        },
        // The closing tag might appear as text
        // We don't assert on the closing tag part
      ],
    });
  });
});
