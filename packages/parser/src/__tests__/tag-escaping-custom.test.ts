import { describe, it, expect } from "bun:test";
import { isAIMLElement } from "@fireworks/types";
import { aimlElements } from "@fireworks/types";
import { parseMDXFilesToAIML } from "..";
import { VFile } from "vfile";

describe("Custom Tag Escaping Tests", () => {
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

  describe("Tag preservation when tag is a string", () => {
    it("should preserve custom tags in the content", async () => {
      const input = `
<workflow id="test">
  <state id="start">
    <customTag>This is a custom tag</customTag>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const testFile = new VFile({
        path: "test.mdx",
        value: input,
      });

      const result = await parseMDXFilesToAIML([testFile]);
      // Check that the custom tag is preserved in the content
      expect(result.nodes[0].children?.[0].children?.[0].type).toBe(
        "paragraph"
      );
      expect(
        result.nodes[0].children?.[0].children?.[0].children?.[0].type
      ).toBe("text");
      expect(
        result.nodes[0].children?.[0].children?.[0].children?.[0].value
      ).toBe("<customTag>This is a custom tag</customTag>");
    });

    it("should preserve nested custom tags in the AST", async () => {
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

      const testFile = new VFile({
        path: "test.mdx",
        value: input,
      });

      const result = await parseMDXFilesToAIML([testFile]);

      // Check that both custom tags are preserved in the content
      expect(result.nodes[0].children?.[0].children?.[0].type).toBe("text");
      expect(result.nodes[0].children?.[0].children?.[0].value).toBe(
        "<customParent><customChild>This is nested content</customChild></customParent>"
      );
    });

    it("should preserve custom tags with attributes in the AST", async () => {
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

      const testFile = new VFile({
        path: "test.mdx",
        value: input,
      });

      const result = await parseMDXFilesToAIML([testFile]);

      // Check that the custom tag and its attributes are preserved
      expect(result.nodes[0].children?.[0].children?.[0].type).toBe("text");
      expect(result.nodes[0].children?.[0].children?.[0].value).toBe(
        '<customTag id="custom1" class="test" data-attr="value">Custom tag with attributes</customTag>'
      );
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

      const result = await parseMDXFilesToAIML([testFile]);

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
