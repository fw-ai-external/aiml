import { describe, expect, test } from "bun:test";
import { parse, stringify, validate } from "./index.js";
import {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
} from "./tags";

const defaultOptions = {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
  includePositions: true,
};

describe("micro-mdx-parser", () => {
  test("should parse a simple HTML string", () => {
    const html = "<h1>Hello world</h1>";
    const ast = parse(html);
    expect(ast[0].type).toBe("element");
    expect(ast[0].tagName).toBe("h1");
    expect(ast[0].children[0].content).toBe("Hello world");
  });

  test("should stringify back to HTML", () => {
    const html = "<h1>Hello world</h1>";
    const ast = parse(html);
    const result = stringify(ast, defaultOptions);
    expect(result).toBe(html);
  });

  test("should validate HTML", () => {
    const html = "<img>Invalid img tag</img>";
    const ast = parse(html);
    const errors = validate(ast);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Missing closing "/>"');
  });

  test("should parse MDX components", () => {
    const mdx = "<Button primary>Click me</Button>";
    const ast = parse(mdx);
    expect(ast[0].type).toBe("element");
    expect(ast[0].tagName).toBe("Button");
    expect(ast[0].props).toHaveProperty("primary");
    expect(ast[0].children[0].content).toBe("Click me");
  });

  test("should handle self-closing tags", () => {
    const mdx = '<Image src="test.jpg" />';
    const ast = parse(mdx);
    expect(ast[0].type).toBe("element");
    expect(ast[0].tagName).toBe("Image");
    expect(ast[0].props).toHaveProperty("src", "test.jpg");
    expect(ast[0].isSelfClosing).toBe(true);
  });

  test("should parse mixed markdown and MDX", () => {
    const mdx = `# Welcome

<Container>
  This is *markdown* inside a **component**.
  <Button>Click me</Button>
</Container>`;

    const ast = parse(mdx);
    expect(ast[0].type).toBe("element");
    expect(ast[0].tagName).toBe("h1");
    expect(ast[1].type).toBe("element");
    expect(ast[1].tagName).toBe("Container");
    expect(ast[1].children).toHaveLength(3);
  });
});
