import { describe, it, expect } from "bun:test";
import { isAIMLElement } from "@fireworks/types";
import { VFile } from "vfile";
import { parseMDXFilesToAIML } from "..";

describe("Tag Escaping Tests", () => {
  describe("Custom tag handling", () => {
    it("should preserve custom tags in the preprocessed content", async () => {
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
      expect(result.diagnostics).toHaveLength(0);
      expect(result.nodes).not.toBeNull();

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
      expect(result.diagnostics).toHaveLength(0);
      expect(result.nodes).not.toBeNull();

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
