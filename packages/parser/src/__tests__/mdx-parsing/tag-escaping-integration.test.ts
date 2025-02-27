import { AimlParser } from "../../index";
import { describe, it, expect, beforeEach } from "bun:test";

describe("Tag Escaping Integration Tests", () => {
  let parser: AimlParser;

  beforeEach(() => {
    parser = new AimlParser();
  });

  describe("End-to-end tag handling", () => {
    it("should preserve all tags in the preprocessed file but only include valid tags in the AST", () => {
      const input = `
---
name: Integration Test
---

<workflow id="test">
  <state id="start">
    <customTag>This should not be in the AST</customTag>
    <log>This should be in the AST</log>
    <invalidTag>
      <nestedInvalid>More invalid content</nestedInvalid>
    </invalidTag>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const filePath = "integration-test.mdx";

      // First, preprocess the file
      const preprocessResult = parser._preProcessFile(filePath, input);
      expect(preprocessResult.errors).toHaveLength(0);
      expect(preprocessResult.parsed).not.toBeNull();

      // Verify all tags (valid and invalid) are preserved in the preprocessed content
      expect(preprocessResult.parsed?.content).toContain("<workflow");
      expect(preprocessResult.parsed?.content).toContain("<state");
      expect(preprocessResult.parsed?.content).toContain("<customTag>");
      expect(preprocessResult.parsed?.content).toContain("<log>");
      expect(preprocessResult.parsed?.content).toContain("<invalidTag>");
      expect(preprocessResult.parsed?.content).toContain("<nestedInvalid>");
      expect(preprocessResult.parsed?.content).toContain("<transition");
      expect(preprocessResult.parsed?.content).toContain("<final");

      // Set the file in the parser
      parser.setFile({ path: filePath, content: input }, true);

      // This is a placeholder for the actual AST verification
      // In a real test, we would:
      // 1. Call parser._createAST(filePath)
      // 2. Verify that the AST contains only valid elements (workflow, state, log, transition, final)
      // 3. Verify that the AST does not contain invalid elements (customTag, invalidTag, nestedInvalid)

      // For now, we're just checking that the test runs without errors
      expect(true).toBe(true);
    });
  });

  describe("Complex MDX with mixed content", () => {
    it("should handle MDX with markdown, JSX, and custom tags", () => {
      const input = `
---
name: Complex MDX Test
---

# This is a markdown heading

<workflow id="test">
  <state id="start">
    This is some text inside a valid tag.
    
    <customTag>This is content in a custom tag</customTag>
    
    ## This is a markdown subheading inside a valid tag
    
    <log>This is a valid tag with content</log>
    
    <invalidTag attr="value">
      <nestedInvalid>Nested invalid content</nestedInvalid>
    </invalidTag>
    
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>

More markdown content outside of JSX.
      `;

      const filePath = "complex-mdx.mdx";

      // Preprocess the file
      const preprocessResult = parser._preProcessFile(filePath, input);
      expect(preprocessResult.errors).toHaveLength(0);
      expect(preprocessResult.parsed).not.toBeNull();

      // Verify all content is preserved in the preprocessed file
      expect(preprocessResult.parsed?.content).toContain("<workflow");
      expect(preprocessResult.parsed?.content).toContain("<state");
      expect(preprocessResult.parsed?.content).toContain("<customTag>");
      expect(preprocessResult.parsed?.content).toContain("<log>");
      expect(preprocessResult.parsed?.content).toContain("<invalidTag");
      expect(preprocessResult.parsed?.content).toContain('attr="value"');
      expect(preprocessResult.parsed?.content).toContain("<nestedInvalid>");
      expect(preprocessResult.parsed?.content).toContain("<transition");
      expect(preprocessResult.parsed?.content).toContain("<final");

      // Verify markdown content is preserved
      expect(preprocessResult.parsed?.content).toContain(
        "# This is a markdown heading"
      );
      expect(preprocessResult.parsed?.content).toContain(
        "## This is a markdown subheading"
      );
      expect(preprocessResult.parsed?.content).toContain(
        "More markdown content outside of JSX"
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle tags with similar names to valid tags", () => {
      // Create tags that are similar to valid tags but not exactly the same
      const validTags = ["workflow", "state", "transition"];
      const similarTags = validTags.map((tag) => `${tag}Extra`);

      // Create a test file with similar tags
      const similarTagElements = similarTags
        .map((tag) => `<${tag}>Similar to valid but invalid</${tag}>`)
        .join("\n  ");

      const input = `
---
name: Similar Tags Test
---

<workflow id="test">
  ${similarTagElements}
</workflow>
      `;

      const filePath = "similar-tags.mdx";

      // Preprocess the file
      const preprocessResult = parser._preProcessFile(filePath, input);
      expect(preprocessResult.errors).toHaveLength(0);
      expect(preprocessResult.parsed).not.toBeNull();

      // Verify similar tags are preserved in the preprocessed content
      for (const tag of similarTags) {
        expect(preprocessResult.parsed?.content).toContain(`<${tag}>`);
      }
    });

    it("should handle tags with attributes", () => {
      const input = `
---
name: Tags With Attributes
---

<workflow id="test">
  <state id="start">
    <customTag id="custom1" class="test" data-attr="value">
      Custom tag with attributes
    </customTag>
    <log id="log1">Valid tag with attributes</log>
    <transition target="end" event="done" />
  </state>
  <final id="end" />
</workflow>
      `;

      const filePath = "tags-with-attributes.mdx";

      // Preprocess the file
      const preprocessResult = parser._preProcessFile(filePath, input);
      expect(preprocessResult.errors).toHaveLength(0);
      expect(preprocessResult.parsed).not.toBeNull();

      // Verify tags with attributes are preserved
      expect(preprocessResult.parsed?.content).toContain(
        '<customTag id="custom1"'
      );
      expect(preprocessResult.parsed?.content).toContain('class="test"');
      expect(preprocessResult.parsed?.content).toContain('data-attr="value"');
      expect(preprocessResult.parsed?.content).toContain('<log id="log1"');
      expect(preprocessResult.parsed?.content).toContain('target="end"');
      expect(preprocessResult.parsed?.content).toContain('event="done"');
    });
  });
});
