import { describe, expect, it } from "bun:test";
import { parse, parseToTokens, TokenType } from "./acorn";
import type { Node } from "acorn";

describe("acorn", () => {
  describe("parser", () => {
    it("should parse basic JSX", () => {
      const code = "<div>Hello</div>";
      const ast = parse(code);
      expect(ast).toBeDefined();
      expect(ast.type).toBe("Program");
      const statement = ast.body[0] as Node & { expression: Node };
      expect(statement.type).toBe("ExpressionStatement");
      expect(statement.expression.type).toBe("JSXElement");
    });
  });

  describe("tokenizer", () => {
    it("should tokenize basic XML", () => {
      const code = "<div>Hello</div>";
      const tokens = parseToTokens(code);

      expect(tokens).toHaveLength(7);
      expect(tokens[0]).toEqual({
        index: 0,
        type: TokenType.StartTag,
        startIndex: 0,
        endIndex: 1,
        raw: "<",
        text: "<",
      });
      expect(tokens[1]).toEqual({
        index: 1,
        type: TokenType.TagName,
        startIndex: 1,
        endIndex: 4,
        raw: "div",
        text: "div",
      });
      expect(tokens[2]).toEqual({
        index: 2,
        type: TokenType.EndTag,
        startIndex: 4,
        endIndex: 5,
        raw: ">",
        text: ">",
      });
    });

    it("should tokenize attributes", () => {
      const code = '<div class="test">';
      const tokens = parseToTokens(code);

      expect(tokens).toHaveLength(6);
      expect(tokens[2]).toEqual({
        index: 2,
        type: TokenType.AttributeName,
        startIndex: 5,
        endIndex: 10,
        raw: "class",
        text: "class",
      });
      expect(tokens[3]).toEqual({
        index: 3,
        type: TokenType.Equal,
        startIndex: 10,
        endIndex: 11,
        raw: "=",
        text: "=",
      });
      expect(tokens[4]).toEqual({
        index: 4,
        type: TokenType.String,
        startIndex: 11,
        endIndex: 17,
        raw: '"test"',
        text: "test",
      });
    });

    it("should handle self-closing tags", () => {
      const code = "<input />";
      const tokens = parseToTokens(code);

      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toEqual({
        index: 0,
        type: TokenType.StartTag,
        startIndex: 0,
        endIndex: 1,
        raw: "<",
        text: "<",
      });
      expect(tokens[1]).toEqual({
        index: 1,
        type: TokenType.TagName,
        startIndex: 1,
        endIndex: 6,
        raw: "input",
        text: "input",
      });
      expect(tokens[2]).toEqual({
        index: 2,
        type: TokenType.Whitespace,
        startIndex: 6,
        endIndex: 7,
        raw: " ",
        text: " ",
      });
      expect(tokens[3]).toEqual({
        index: 3,
        type: TokenType.SimpleEndTag,
        startIndex: 7,
        endIndex: 9,
        raw: "/>",
        text: "/>",
      });
    });

    it("should handle JSX expressions in attributes", () => {
      const code = "<div value={true}>";
      const tokens = parseToTokens(code);

      expect(tokens[4]).toEqual({
        index: 4,
        type: TokenType.AttributeValue,
        startIndex: 11,
        endIndex: 17,
        raw: "{true}",
        text: "true",
      });
    });

    it("should handle invalid XML", () => {
      const code = "<div><span></div>";
      const tokens = parseToTokens(code);

      expect(tokens[0]).toEqual({
        index: 0,
        type: TokenType.Invalid,
        startIndex: 0,
        endIndex: code.length,
        raw: code,
        text: code,
        error: expect.any(String),
      });
    });
  });
});
