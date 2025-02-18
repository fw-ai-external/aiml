import { describe, expect, test } from "bun:test";
import { toHTML } from "./stringify";
import { ElementNode, PositionRange } from "./types";
import { voidTags } from "./tags";

const mockPosition: PositionRange = {
  start: { index: 0, line: 1, column: 1 },
  end: { index: 11, line: 1, column: 12 },
};

const options = { voidTags };

describe("stringify", () => {
  test("should stringify basic HTML", () => {
    const input: ElementNode[] = [
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

    const result = toHTML(input, options);
    expect(result).toBe("<div>Hello</div>");
  });

  test("should stringify self-closing tags", () => {
    const input: ElementNode[] = [
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

    const result = toHTML(input, options);
    expect(result).toBe('<img src="test.jpg" />');
  });

  test("should stringify nested elements", () => {
    const input: ElementNode[] = [
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

    const result = toHTML(input, options);
    expect(result).toBe("<div><span>Nested</span></div>");
  });

  test("should stringify MDX components", () => {
    const input: ElementNode[] = [
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

    const result = toHTML(input, options);
    expect(result).toBe("<Button primary>Click me</Button>");
  });

  test("should stringify complex attributes", () => {
    const input: ElementNode[] = [
      {
        type: "element",
        tagName: "div",
        props: {
          class: "test",
          id: "main",
          "data-value": 123,
        },
        propsRaw: ' class="test" id="main" data-value={123}',
        children: [],
        position: mockPosition,
      },
    ];

    const result = toHTML(input, options);
    expect(result).toBe('<div class="test" id="main" data-value={123}></div>');
  });

  test("should handle boolean attributes", () => {
    const input: ElementNode[] = [
      {
        type: "element",
        tagName: "button",
        props: { disabled: true },
        propsRaw: " disabled",
        children: [
          {
            type: "text",
            content: "Submit",
            position: mockPosition,
          },
        ],
        position: mockPosition,
      },
    ];

    const result = toHTML(input, options);
    expect(result).toBe("<button disabled>Submit</button>");
  });
});
