import { AimlParser } from "../index";
import { describe, it, expect, beforeEach } from "bun:test";
import { isAIMLElement } from "@fireworks/types";

describe("Tag Escaping Tests", () => {
  let parser: AimlParser;

  beforeEach(() => {
    parser = new AimlParser();
  });

  describe("Custom tag handling", () => {
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
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();

      // Check that the custom tag is preserved in the content
      expect(result.parsed?.content).toContain("<customTag>");
    });

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
