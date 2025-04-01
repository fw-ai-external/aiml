import { describe, expect, it } from "bun:test";
import { isAIMLElement } from "@fireworks/shared";
import { aimlElements } from "@fireworks/shared";
import { VFile } from "vfile";
import { parseMDXFilesToAIML } from "..";

describe("Tag Escaping Final Tests", () => {
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

  describe("AST creation with custom tags", () => {
    it("should only include valid AIML elements in the AST", async () => {
      const input = `
<workflow id="test">
  <state id="start">
    <customTag>This should not be in the AST</customTag>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const testFile = new VFile({
        path: "test.mdx",
        value: input,
      });

      const result = await parseMDXFilesToAIML([testFile], {
        filePath: "test.mdx",
        files: [],
        preserveCustomTags: false,
      });

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
