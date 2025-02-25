import { describe, expect, test } from "bun:test";
import { MDXParser } from "../mdx";
import { BaseElement } from "../BaseElement";

describe("MDXParser Failure Cases", () => {
  test("should throw error for non-JSX input", () => {
    const mdx = "This is not JSX at all";
    const parser = new MDXParser(mdx);
    expect(() => parser.parse()).toThrow("No JSX element found in MDX file");
  });

  test("should throw error for broken JSX structure", () => {
    const mdx = "<State><Broken</State>";
    const parser = new MDXParser(mdx);
    expect(() => parser.parse()).toThrow();
  });

  test("should handle elements with missing id by generating UUIDs", () => {
    const mdx = "<State><Action /></State>";
    const parser = new MDXParser(mdx);
    const result = parser.parse();
    // Check that root element and its child have valid IDs
    expect(result.ast).toBeInstanceOf(BaseElement);
    expect(result.ast.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(result.ast.children[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test("should correctly parse nested valid MDX elements", () => {
    const mdx = `
      <State id="parent">
        <Action id="child1" />
        <Action id="child2" />
      </State>
    `;
    const parser = new MDXParser(mdx);
    const result = parser.parse();
    expect(result.ast).toBeInstanceOf(BaseElement);
    expect(result.ast.tag).toBe("State");
    expect(result.ast.children).toHaveLength(2);
    expect(result.ast.children[0].tag).toBe("Action");
  });
});
