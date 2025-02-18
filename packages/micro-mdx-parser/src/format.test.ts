import { describe, expect, test } from "bun:test";
import { format } from "./format";
import { ElementNode, Token, PositionRange } from "./types";
import {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
} from "./tags";

const mockPosition: PositionRange = {
  start: { index: 0, line: 1, column: 1 },
  end: { index: 11, line: 1, column: 12 },
};

const defaultOptions = {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
  includePositions: true,
};

describe("format", () => {
  test("should format basic nodes", () => {
    const input: (ElementNode | Token)[] = [
      {
        type: "element",
        tagName: "div",
        props: {},
        propsRaw: "",
        children: [
          {
            type: "text",
            content: "Hello",
            position: mockPosition,
          },
        ],
        position: mockPosition,
      },
    ];

    const result = format(input, defaultOptions, "");
    expect(result[0].type).toBe("element");
    expect((result[0] as ElementNode).tagName).toBe("div");
    expect((result[0] as ElementNode).children[0].content).toBe("Hello");
  });

  test("should format MDX components", () => {
    const input: (ElementNode | Token)[] = [
      {
        type: "element",
        tagName: "Button",
        props: { primary: true },
        propsRaw: " primary",
        children: [
          {
            type: "text",
            content: "Click me",
            position: mockPosition,
          },
        ],
        position: mockPosition,
      },
    ];

    const result = format(input, defaultOptions, "");
    const node = result[0] as ElementNode;
    expect(node.type).toBe("element");
    expect(node.tagName).toBe("Button");
    expect(node.props).toHaveProperty("primary", true);
    expect(node.children[0].content).toBe("Click me");
  });

  test("should format nested elements", () => {
    const input: (ElementNode | Token)[] = [
      {
        type: "element",
        tagName: "div",
        props: {},
        propsRaw: "",
        children: [
          {
            type: "element",
            tagName: "span",
            props: {},
            propsRaw: "",
            children: [
              {
                type: "text",
                content: "Nested",
                position: mockPosition,
              },
            ],
            position: mockPosition,
          },
        ],
        position: mockPosition,
      },
    ];

    const result = format(input, defaultOptions, "");
    const node = result[0] as ElementNode;
    expect(node.type).toBe("element");
    expect(node.tagName).toBe("div");
    expect(node.children[0].type).toBe("element");
    expect((node.children[0] as ElementNode).tagName).toBe("span");
    expect((node.children[0] as ElementNode).children[0].content).toBe(
      "Nested"
    );
  });

  test("should handle void elements", () => {
    const input: (ElementNode | Token)[] = [
      {
        type: "element",
        tagName: "img",
        props: { src: "test.jpg" },
        propsRaw: ' src="test.jpg"',
        children: [],
        position: mockPosition,
        isSelfClosing: true,
      },
    ];

    const result = format(input, defaultOptions, "");
    const node = result[0] as ElementNode;
    expect(node.type).toBe("element");
    expect(node.tagName).toBe("img");
    expect(node.isSelfClosing).toBe(true);
    expect(node.props).toHaveProperty("src", "test.jpg");
  });

  test("should preserve position information", () => {
    const input: (ElementNode | Token)[] = [
      {
        type: "element",
        tagName: "div",
        props: {},
        propsRaw: "",
        children: [],
        position: mockPosition,
      },
    ];

    const result = format(input, defaultOptions, "");
    const node = result[0] as ElementNode;
    expect(node.position).toBeDefined();
    expect(node.position).toEqual(mockPosition);
  });
});
