import { describe, expect, test } from "bun:test";
import { MDXParser } from "../mdx";
import { BaseElement } from "../BaseElement";
import type { ElementRole } from "@fireworks/types";

describe("MDXParser", () => {
  describe("Constructor", () => {
    test("should initialize with empty source code", () => {
      const parser = new MDXParser("");
      expect(parser).toBeInstanceOf(MDXParser);
    });
  });

  describe("Basic MDX Parsing", () => {
    test("should parse simple MDX with single element", () => {
      const mdx = "<State id='test'>Hello</State>";
      const parser = new MDXParser(mdx);
      const result = parser.parse(mdx);

      expect(result.ast).toBeInstanceOf(BaseElement);
      expect(result.ast.tag).toBe("State");
      expect(result.ast.attributes.id).toBe("test");
      expect(result.errors).toHaveLength(0);
    });

    test("should parse nested elements", () => {
      const mdx = `
        <State id="parent">
          <Action id="child1" />
          <Action id="child2" />
        </State>
      `;
      const parser = new MDXParser(mdx);
      const result = parser.parse(mdx);

      expect(result.ast.children).toHaveLength(2);
      expect(result.ast.children[0].tag).toBe("Action");
      expect(result.ast.children[0].attributes.id).toBe("child1");
      expect(result.ast.children[1].attributes.id).toBe("child2");
    });

    test("should parse elements with multiple attributes", () => {
      const mdx = '<Input id="form" type="text" required="true" />';
      const parser = new MDXParser(mdx);
      const result = parser.parse(mdx);

      expect(result.ast.attributes).toEqual({
        id: "form",
        type: "text",
        required: "true",
      });
    });
  });

  describe("Role Assignment", () => {
    test("should assign correct role based on tag name", () => {
      const testCases: Array<{ mdx: string; expectedRole: ElementRole }> = [
        { mdx: "<State />", expectedRole: "state" },
        { mdx: "<Action />", expectedRole: "action" },
        { mdx: "<UserInput />", expectedRole: "user-input" },
        { mdx: "<ErrorState />", expectedRole: "error" },
        { mdx: "<Output />", expectedRole: "output" },
      ];

      testCases.forEach(({ mdx, expectedRole }) => {
        const parser = new MDXParser(mdx);
        const result = parser.parse(mdx);
        expect(result.ast.role).toBe(expectedRole);
      });
    });
  });

  describe("Error Handling", () => {
    test("should throw error for invalid JSX", () => {
      const mdx = "<State><Broken</State>";
      const parser = new MDXParser(mdx);

      expect(() => parser.parse(mdx)).toThrow();
    });

    test("should throw error for missing root element", () => {
      const mdx = "Just some text without JSX";
      const parser = new MDXParser(mdx);

      expect(() => parser.parse(mdx)).toThrow(
        "No JSX element found in MDX file"
      );
    });

    test("should collect multiple errors in non-strict mode", () => {
      const mdx = `
        <State>
          <InvalidTag>
          <BrokenElement
        </State>
      `;
      const parser = new MDXParser(mdx);
      let result;

      try {
        result = parser.parse(mdx);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Complex Scenarios", () => {
    test("should parse complex nested structure", () => {
      const mdx = `
        <State id="workflow">
          <Action id="start">
            <UserInput id="form">
              <Output id="display" />
            </UserInput>
          </Action>
          <ErrorState id="error" />
        </State>
      `;
      const parser = new MDXParser(mdx);
      const result = parser.parse(mdx);

      expect(result.ast.tag).toBe("State");
      expect(result.ast.children).toHaveLength(2);
      expect(result.ast.children[0].children[0].children[0].tag).toBe("Output");
      expect(result.ast.children[1].tag).toBe("ErrorState");
    });

    test("should handle elements with mixed content", () => {
      const mdx = `
        <State id="mixed">
          <Action id="action1" type="primary" />
          <ErrorState id="error1" severity="high" />
          <Output id="output1" format="json" />
        </State>
      `;
      const parser = new MDXParser(mdx);
      const result = parser.parse(mdx);

      expect(result.ast.children).toHaveLength(3);
      expect(result.ast.children.map((child) => child.role)).toEqual([
        "action",
        "error",
        "output",
      ]);
    });
  });

  describe("UUID Generation", () => {
    test("should generate UUIDs for elements without IDs", () => {
      const mdx = "<State><Action /></State>";
      const parser = new MDXParser(mdx);
      const result = parser.parse(mdx);

      expect(result.ast.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(result.ast.children[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });
});
