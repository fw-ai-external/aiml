import { describe, expect, test } from "bun:test";
import { parser } from "./parser";
import { lexer } from "./lexer";
import { ElementNode, LexerOptions, Token } from "./types";
import {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
} from "./tags";

const defaultOptions: LexerOptions = {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
  includePositions: true,
};

describe("parser", () => {
  test("should parse basic HTML", () => {
    const tokens = lexer("<div>Hello</div>", defaultOptions);
    const nodes = parser(tokens, defaultOptions);
    expect(nodes[0].type).toBe("element");
    expect((nodes[0] as ElementNode).tagName).toBe("div");
    expect((nodes[0] as ElementNode).children[0].content).toBe("Hello");
  });

  test("should parse self-closing tags", () => {
    const tokens = lexer("<img src='test.jpg'/>", defaultOptions);
    const nodes = parser(tokens, defaultOptions);
    expect(nodes[0].type).toBe("element");
    expect((nodes[0] as ElementNode).tagName).toBe("img");
    expect((nodes[0] as ElementNode).isSelfClosing).toBe(true);
  });

  test("should parse nested elements", () => {
    const tokens = lexer(
      "<div><span>Hello</span> <b>World</b></div>",
      defaultOptions
    );
    const nodes = parser(tokens, defaultOptions);
    const node = nodes[0] as ElementNode;
    expect(node.type).toBe("element");
    expect(node.tagName).toBe("div");
    expect(node.children).toHaveLength(3);
    expect((node.children[0] as ElementNode).tagName).toBe("span");
    expect((node.children[2] as ElementNode).tagName).toBe("b");
  });

  test("should parse attributes", () => {
    const tokens = lexer(
      "<div class='test' id='main'>Content</div>",
      defaultOptions
    );
    const nodes = parser(tokens, defaultOptions);
    const node = nodes[0] as ElementNode;
    expect(node.type).toBe("element");
    expect(node.props).toEqual({
      class: "test",
      id: "main",
    });
  });

  test("should handle void elements", () => {
    const tokens = lexer("<br><hr/>", defaultOptions);
    const nodes = parser(tokens, defaultOptions);
    expect(nodes).toHaveLength(2);
    expect((nodes[0] as ElementNode).tagName).toBe("br");
    expect((nodes[1] as ElementNode).tagName).toBe("hr");
    expect((nodes[1] as ElementNode).isSelfClosing).toBe(true);
  });

  test("should parse MDX components", () => {
    const tokens = lexer(
      `# Hello

<Button primary onClick={() => {}}>Click me</Button>`,
      defaultOptions
    );
    const nodes = parser(tokens, defaultOptions);
    const text = nodes[0] as Token;
    const text2 = nodes[1] as Token;
    const node = nodes[2] as ElementNode;
    expect(text.type).toBe("text");
    expect(text.content).toBe("# Hello");
    expect(text2.type).toBe("text");
    expect(text2.content).toBe("\n\n");

    expect(node.type).toBe("element");
    expect(node.tagName).toBe("Button");
    expect(node.props).toHaveProperty("primary");
    expect(node.propsRaw).toContain("onClick={() => {}}");
  });
});
