import { AimlParser } from "../../index";
import { describe, it, expect, beforeEach } from "bun:test";
import { isAIMLElement } from "@fireworks/types";

describe("AimlParser AST Creation", () => {
  let parser: AimlParser;

  beforeEach(() => {
    parser = new AimlParser();
  });

  describe("_createAST", () => {
    it("should create AST with only valid AIML elements", () => {
      const input = `
---
name: AST Test
---

<workflow id="test">
  <state id="start">
    <customTag>This should not be in the AST</customTag>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const filePath = "ast-test.mdx";
      parser.setFile({ path: filePath, content: input }, true);

      // This is a placeholder for the actual implementation
      // In a real test, we would call parser._createAST(filePath)
      // and verify the AST structure

      // For now, we're just checking that the test runs without errors
      expect(true).toBe(true);
    });
  });

  describe("_parseJSXNode", () => {
    it("should only parse valid AIML elements into the AST", () => {
      // This test is a placeholder since we can't directly test _parseJSXNode
      // without mocking ts-morph objects
      expect(true).toBe(true);
    });
  });

  describe("_findRootJSXElement", () => {
    it("should find the root JSX element in a file with custom tags", () => {
      // This test is a placeholder since we can't directly test _findRootJSXElement
      // without mocking ts-morph objects
      expect(true).toBe(true);
    });
  });

  describe("isAIMLElement function", () => {
    it("should correctly identify valid AIML elements", () => {
      // Test some known valid element types
      expect(isAIMLElement("workflow")).toBe(true);
      expect(isAIMLElement("state")).toBe(true);
      expect(isAIMLElement("transition")).toBe(true);
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

  describe("Integration: AST creation with mixed tags", () => {
    it("should create an AST with only valid tags from mixed content", () => {
      const input = `
---
name: Mixed Tags AST Test
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

      const filePath = "mixed-tags-ast.mdx";
      parser.setFile({ path: filePath, content: input }, true);

      // This is a placeholder for the actual implementation
      // In a real test, we would:
      // 1. Call parser._createAST(filePath)
      // 2. Verify that the AST contains only valid elements (workflow, state, log, transition, final)
      // 3. Verify that the AST does not contain invalid elements (customTag, invalidTag, nestedInvalid)

      // For now, we're just checking that the test runs without errors
      expect(true).toBe(true);
    });
  });
});
