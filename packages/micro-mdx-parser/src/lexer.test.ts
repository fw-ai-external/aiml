import { describe, expect, test } from "bun:test";
import { lexer } from "./lexer";
import { LexerOptions } from "./types";
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

describe("lexer", () => {
  test("should return tokens", () => {
    const str = "<h1>Test case</h1>";
    const tokens = lexer(str, defaultOptions);
    expect(tokens).toEqual([
      {
        type: "tag-start",
        close: false,
        position: {
          start: {
            index: 0,
            line: 1,
            column: 1,
          },
          end: {
            index: 1,
            line: 1,
            column: 2,
          },
        },
      },
      {
        type: "tag",
        content: "h1",
      },
      {
        type: "tag-end",
        close: false,
        position: {
          start: {
            index: 4,
            line: 1,
            column: 5,
          },
          end: {
            index: 4,
            line: 1,
            column: 5,
          },
        },
      },
      {
        type: "text",
        content: "Test case",
        position: {
          start: {
            index: 4,
            line: 1,
            column: 5,
          },
          end: {
            index: 13,
            line: 1,
            column: 14,
          },
        },
      },
      {
        type: "tag-start",
        close: true,
        position: {
          start: {
            index: 13,
            line: 1,
            column: 14,
          },
          end: {
            index: 15,
            line: 1,
            column: 16,
          },
        },
      },
      {
        type: "tag",
        content: "h1",
      },
      {
        type: "tag-end",
        close: false,
        position: {
          start: {
            index: 18,
            line: 1,
            column: 19,
          },
          end: {
            index: 18,
            line: 1,
            column: 19,
          },
        },
      },
    ]);
  });

  test("should parse tags beginning with alphanumeric names", () => {
    const str = "2 <a 4 >";
    const tokens = lexer(str, defaultOptions);
    expect(tokens).toEqual([
      {
        type: "text",
        content: "2 ",
        position: {
          start: {
            index: 0,
            line: 1,
            column: 1,
          },
          end: {
            index: 2,
            line: 1,
            column: 3,
          },
        },
      },
      {
        type: "tag-start",
        close: false,
        position: {
          start: {
            index: 2,
            line: 1,
            column: 3,
          },
          end: {
            index: 3,
            line: 1,
            column: 4,
          },
        },
      },
      {
        type: "tag",
        content: "a",
      },
      {
        type: "attribute",
        content: "4",
        src: " 4 ",
      },
      {
        type: "tag-end",
        close: false,
        position: {
          start: {
            index: 8,
            line: 1,
            column: 9,
          },
          end: {
            index: 8,
            line: 1,
            column: 9,
          },
        },
      },
    ]);
  });

  test("should skip lexing the content of childless tags", () => {
    const str = "<template>Hello <img/></template>";
    const tokens = lexer(str, {
      ...defaultOptions,
      childlessTags: ["template"],
    });
    expect(tokens).toEqual([
      {
        type: "tag-start",
        close: false,
        position: {
          start: {
            index: 0,
            line: 1,
            column: 1,
          },
          end: {
            index: 1,
            line: 1,
            column: 2,
          },
        },
      },
      {
        type: "tag",
        content: "template",
      },
      {
        type: "tag-end",
        close: false,
        position: {
          start: {
            index: 10,
            line: 1,
            column: 11,
          },
          end: {
            index: 10,
            line: 1,
            column: 11,
          },
        },
      },
      {
        type: "text",
        content: "Hello <img/>",
        position: {
          start: {
            index: 10,
            line: 1,
            column: 11,
          },
          end: {
            index: 22,
            line: 1,
            column: 23,
          },
        },
      },
      {
        type: "tag-start",
        close: true,
        position: {
          start: {
            index: 22,
            line: 1,
            column: 23,
          },
          end: {
            index: 24,
            line: 1,
            column: 25,
          },
        },
      },
      {
        type: "tag",
        content: "template",
      },
      {
        type: "tag-end",
        close: false,
        position: {
          start: {
            index: 33,
            line: 1,
            column: 34,
          },
          end: {
            index: 33,
            line: 1,
            column: 34,
          },
        },
      },
    ]);
  });

  test("should handle self-closing tags", () => {
    const str = "<img/>";
    const tokens = lexer(str, defaultOptions);
    expect(tokens).toEqual([
      {
        type: "tag-start",
        close: false,
        position: {
          start: {
            index: 0,
            line: 1,
            column: 1,
          },
          end: {
            index: 1,
            line: 1,
            column: 2,
          },
        },
      },
      {
        type: "tag",
        content: "img",
      },
      {
        type: "tag-end",
        close: true,
        isSelfClosing: true,
        position: {
          start: {
            index: 6,
            line: 1,
            column: 7,
          },
          end: {
            index: 6,
            line: 1,
            column: 7,
          },
        },
      },
    ]);
  });

  test("should parse MDX components", () => {
    const mdx = `# Hello

<Container>
  This is *markdown* inside a **component**.
  <Button>Click me</Button>
</Container>`;

    const tokens = lexer(mdx, defaultOptions);
    console.log(JSON.stringify(tokens, null, 2));
    expect(tokens[0].type).toBe("text");
    expect(tokens[0].content).toBe("# Hello");
  });
});
