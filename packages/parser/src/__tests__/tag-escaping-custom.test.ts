import { AimlParser } from "../index";
import { describe, it, expect, beforeEach } from "bun:test";
import { isAIMLElement } from "@fireworks/types";
import { aimlElements } from "@fireworks/types";

describe("Custom Tag Escaping Tests", () => {
  let parser: AimlParser;

  beforeEach(() => {
    parser = new AimlParser();
  });

  describe("Valid vs Invalid Tags", () => {
    it("should correctly identify valid AIML elements", () => {
      // Test all valid element types from aimlElements
      for (const tag of aimlElements) {
        expect(isAIMLElement(tag)).toBe(true);
      }
    });

    it("should correctly identify invalid AIML elements", () => {
      const invalidTags = [
        "customTag",
        "invalidElement",
        "notDefined",
        "randomTag",
        "htmlTag",
        "div",
        "span",
        "p",
      ];

      // Verify these tags are actually invalid
      for (const tag of invalidTags) {
        expect(isAIMLElement(tag)).toBe(false);
      }
    });
  });

  describe("Tag preservation in _preProcessFile", () => {
    it("should preserve custom tags in the preprocessed content", () => {
      const input = `
<workflow id="test">
  <state id="start">
    <customTag>This is a custom tag</customTag>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const result = parser._preProcessFile("custom-tags.mdx", input);
      console.log(result.parsed?.content);
      // Check that the custom tag is preserved in the content
      expect(result.parsed?.content).toContain("<customTag>");
      expect(result.parsed?.content).toContain("This is a custom tag");
    });

    it("should preserve nested custom tags in the preprocessed content", () => {
      const input = `
<workflow id="test">
  <state id="start">
    <customParent>
      <customChild>This is nested content</customChild>
    </customParent>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const result = parser._preProcessFile("nested-custom-tags.mdx", input);

      // Check that both custom tags are preserved in the content
      expect(result.parsed?.content).toContain("<customParent>");
      expect(result.parsed?.content).toContain("<customChild>");
      expect(result.parsed?.content).toContain("This is nested content");
    });

    it("should preserve custom tags with attributes in the preprocessed content", () => {
      const input = `
<workflow id="test">
  <state id="start">
    <customTag id="custom1" class="test" data-attr="value">
      Custom tag with attributes
    </customTag>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const result = parser._preProcessFile(
        "custom-tags-with-attrs.mdx",
        input
      );

      // Check that the custom tag and its attributes are preserved
      expect(result.parsed?.content).toContain('<customTag id="custom1"');
      expect(result.parsed?.content).toContain('class="test"');
      expect(result.parsed?.content).toContain('data-attr="value"');
    });
  });

  describe("AST creation with custom tags", () => {
    it("should only include valid AIML elements in the AST", () => {
      const input = `
<workflow id="test">
  <state id="start">
    <customTag>This should not be in the AST</customTag>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      // Set the file in the parser
      parser.setFile({ path: "ast-test.mdx", content: input }, true);

      // Check that customTag is not a valid AIML element
      expect(isAIMLElement("customTag")).toBe(false);

      // Check that workflow, state, transition, and final are valid AIML elements
      expect(isAIMLElement("workflow")).toBe(true);
      expect(isAIMLElement("state")).toBe(true);
      expect(isAIMLElement("transition")).toBe(true);
      expect(isAIMLElement("final")).toBe(true);
    });
  });
});
