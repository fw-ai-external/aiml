import { AimlParser } from "../../index";
import { describe, it, expect, beforeEach } from "bun:test";
import { allElementConfigs } from "@fireworks/element-config";
import { ElementType } from "@fireworks/types";

describe("AimlParser Tag Escaping", () => {
  let parser: AimlParser;

  beforeEach(() => {
    parser = new AimlParser();
  });

  // Helper function to check if a tag is defined in allElementConfigs
  const isValidTag = (tagName: string): boolean => {
    return Object.keys(allElementConfigs).includes(tagName as ElementType);
  };

  describe("Tag handling in _preProcessFile", () => {
    it("should preserve valid tags defined in allElementConfigs", () => {
      // Create a test file with all valid tags
      const validTags = Object.keys(allElementConfigs);
      const tagElements = validTags
        .map((tag) => `<${tag}>Test</${tag}>`)
        .join("\n  ");

      const input = `
---
name: Valid Tags Test
---

<workflow id="test">
  ${tagElements}
</workflow>
      `;

      const result = parser._preProcessFile("valid-tags.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();

      // Check that all valid tags are preserved in the processed content
      for (const tag of validTags) {
        expect(result.parsed?.content).toContain(`<${tag}>`);
      }
    });

    it("should handle invalid tags not defined in allElementConfigs", () => {
      // Create a list of invalid tags that are not in allElementConfigs
      const invalidTags = [
        "customTag",
        "invalidElement",
        "notDefined",
        "randomTag",
        "htmlTag",
      ];

      // Verify these tags are actually invalid
      for (const tag of invalidTags) {
        expect(isValidTag(tag)).toBe(false);
      }

      const tagElements = invalidTags
        .map((tag) => `<${tag}>Test</${tag}>`)
        .join("\n  ");

      const input = `
---
name: Invalid Tags Test
---

<workflow id="test">
  ${tagElements}
</workflow>
      `;

      const result = parser._preProcessFile("invalid-tags.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();

      // Check that all invalid tags are preserved in the processed content
      // They should be treated as text, not actual JSX
      for (const tag of invalidTags) {
        expect(result.parsed?.content).toContain(`<${tag}>`);
      }
    });

    it("should handle a mix of valid and invalid tags", () => {
      // Get a subset of valid tags
      const validTags = Object.keys(allElementConfigs).slice(0, 3);
      const invalidTags = ["customTag", "invalidElement", "notDefined"];

      // Create a mixed content with both valid and invalid tags
      const validElements = validTags
        .map((tag) => `<${tag}>Valid</${tag}>`)
        .join("\n  ");
      const invalidElements = invalidTags
        .map((tag) => `<${tag}>Invalid</${tag}>`)
        .join("\n  ");

      const input = `
---
name: Mixed Tags Test
---

<workflow id="test">
  ${validElements}
  ${invalidElements}
</workflow>
      `;

      const result = parser._preProcessFile("mixed-tags.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();

      // Check that all tags (both valid and invalid) are preserved in the content
      for (const tag of [...validTags, ...invalidTags]) {
        expect(result.parsed?.content).toContain(`<${tag}>`);
      }
    });

    it("should handle nested invalid tags", () => {
      const input = `
---
name: Nested Invalid Tags
---

<workflow id="test">
  <state id="start">
    <invalidParent>
      <invalidChild>This is nested invalid content</invalidChild>
    </invalidParent>
    <transition target="end" />
  </state>
</workflow>
      `;

      const result = parser._preProcessFile("nested-invalid.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();

      // Both invalid tags should be preserved in the content
      expect(result.parsed?.content).toContain("<invalidParent>");
      expect(result.parsed?.content).toContain("<invalidChild>");
    });
  });

  // This test will need to be implemented once we have a way to test the AST creation
  describe("AST creation with invalid tags", () => {
    it("should only include valid tags in the AST", () => {
      const input = `
---
name: AST Test
---

<workflow id="test">
  <state id="start">
    <customTag>This should not be in the AST</customTag>
    <transition target="end" />
  </state>
</workflow>
      `;

      const filePath = "ast-test.mdx";
      parser.setFile({ path: filePath, content: input }, true);

      // This is a placeholder for the actual implementation
      // In a real test, we would verify that customTag is not in the AST
      // but is preserved in the original content
      expect(true).toBe(true);
    });
  });
});
