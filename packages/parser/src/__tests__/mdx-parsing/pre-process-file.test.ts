import { AimlParser } from "../../index";
import { describe, it, expect, beforeEach } from "bun:test";

describe("AimlParser._preProcessFile", () => {
  let parser: AimlParser;

  beforeEach(() => {
    parser = new AimlParser();
  });

  describe("Basic functionality", () => {
    it("should process a simple MDX file with frontmatter", () => {
      const input = `
---
name: Simple Test
---

<workflow id="test">
  <state id="start">
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const result = parser._preProcessFile("simple.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();
      expect(result.sourcemap).not.toBeNull();

      // Check that the parsed content includes the frontmatter data
      expect(result.parsed?.name).toBe("Simple Test");

      // Check that the content includes the JSX
      expect(result.parsed?.content).toContain("<workflow");
      expect(result.parsed?.content).toContain("<state");
      expect(result.parsed?.content).toContain("<transition");
      expect(result.parsed?.content).toContain("<final");
    });

    it("should handle MDX files without frontmatter", () => {
      const input = `
<workflow id="test">
  <state id="start">
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const result = parser._preProcessFile("no-frontmatter.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();

      // Check that the parsed content has default values for frontmatter
      expect(result.parsed?.name).toBe("");

      // Check that the content includes the JSX
      expect(result.parsed?.content).toContain("<workflow");
    });
  });

  describe("Import handling", () => {
    it("should correctly split imports from content", () => {
      const input = `
import { something } from 'somewhere';
import { somethingElse } from 'somewhere-else';

<workflow id="test">
  <state id="start" />
</workflow>
      `;

      const result = parser._preProcessFile("imports.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();

      // Check that imports are preserved
      expect(result.parsed?.content).toContain(
        "import { something } from 'somewhere';"
      );
      expect(result.parsed?.content).toContain(
        "import { somethingElse } from 'somewhere-else';"
      );

      // Check that the content is also preserved
      expect(result.parsed?.content).toContain("<workflow");
    });

    it("should handle comments before imports", () => {
      const input = `
{/* This is a comment before imports */}
import { something } from 'somewhere';

<workflow id="test">
  <state id="start" />
</workflow>
      `;

      const result = parser._preProcessFile("comments-imports.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();

      // Check that comments are preserved
      expect(result.parsed?.content).toContain(
        "{/* This is a comment before imports */}"
      );

      // Check that imports are preserved
      expect(result.parsed?.content).toContain(
        "import { something } from 'somewhere';"
      );

      // Check that the content is also preserved
      expect(result.parsed?.content).toContain("<workflow");
    });
  });

  describe("Error handling", () => {
    it("should handle errors gracefully", () => {
      // Create an invalid MDX file (missing closing tag)
      const input = `
<workflow id="test">
  <state id="start">
    <transition target="end" />
  </state>
  <final id="end">
</workflow>
      `;

      // This should not throw but collect errors
      const result = parser._preProcessFile("invalid.mdx", input);

      // We expect errors to be collected
      expect(result.errors.length).toBeGreaterThan(0);

      // The original content should be preserved
      expect(result.original).toBe(input);

      // But parsed content should be null due to errors
      expect(result.parsed).toBeNull();
    });
  });

  describe("Sourcemap generation", () => {
    it("should generate a sourcemap for valid content", () => {
      const input = `
<workflow id="test">
  <state id="start">
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      const result = parser._preProcessFile("sourcemap.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.sourcemap).not.toBeNull();

      // We can't easily test the sourcemap content directly,
      // but we can verify it's a non-empty string
      expect(typeof result.sourcemap).toBe("string");
      expect(result.sourcemap?.length).toBeGreaterThan(0);
    });
  });

  describe("Content wrapping", () => {
    it("should wrap the MDX content in a JSX fragment", () => {
      const input = `
<workflow id="test">
  <state id="start" />
</workflow>
      `;

      const result = parser._preProcessFile("wrap.mdx", input);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).not.toBeNull();

      // Check that the content is wrapped in a JSX fragment
      expect(result.parsed?.content).toContain("export default function () {");
      expect(result.parsed?.content).toContain("return <>");
      expect(result.parsed?.content).toContain("</>");
    });
  });
});
