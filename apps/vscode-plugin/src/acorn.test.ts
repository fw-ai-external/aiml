import { describe, expect, it } from "bun:test";
import { parseToTokens, TokenType } from "./acorn";

describe("acorn", () => {
  describe("tokenizer", () => {
    it("should tokenize basic XML", () => {
      const code = "<div>Hello</div>";
      const tokens = parseToTokens(code);

      expect(tokens).toHaveLength(6);
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
      const code = "<div value={true} />";
      const tokens = parseToTokens(code);

      expect(tokens[4]).toEqual({
        index: 4,
        type: TokenType.AttributeBoolean,
        startIndex: 11,
        endIndex: 17,
        raw: "{true}",
        text: "true",
      });
    });

    it("should handle JSX expressions in attributes and no closing tag", () => {
      const code = "<div value={true}>";
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

    it("should handle invalid syntax", () => {
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

    it("should handle multiple JSX elements as an error", () => {
      const code = "<div /> <div />";
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

    it("should handle attribute names", () => {
      const tokens = parseToTokens(`
        <>
          <state id="normal"/>
          <parallel id={'concurrent'}/>
          <final id={"concurrent"}/>
          <history id={\`prev\`}/>
        </>
        `);

      const attributeTokens = tokens
        .filter((token) => token.type === TokenType.AttributeName)
        .map((token) => token.raw);
      expect(attributeTokens).toEqual(["id", "id", "id", "id"]);
    });

    it("should handle attribute values (strings)", () => {
      const tokens = parseToTokens(`
        <>
          <state id="normal"/>
          <parallel id={'concurrent'}/>
          <final id={"concurrent"}/>
          <history id={\`prev\`}/>
        </>
        `);

      const attributeTokens = tokens
        .filter(
          (token) =>
            token.type === TokenType.AttributeString ||
            token.type === TokenType.AttributeExpression
        )
        .map((token) => token.raw);
      expect(attributeTokens).toEqual([
        '"normal"',
        "'concurrent'",
        '"concurrent"',
        '"prev"',
      ]);
    });

    it("should handle attribute values (strings) with spaces", () => {
      const tokens = parseToTokens(`<>
      <state id="test"/>
    </>`);

      const attributeTokens = tokens
        .filter((token) => token.type === TokenType.AttributeString)
        .map((token) => token.text);
      expect(attributeTokens).toEqual(["test"]);
    });

    it("should handle attribute values (booleans)", () => {
      const tokens = parseToTokens(`
        <>
          <state value={true}/>
          <parallel value={false} />
          <final value={true} />
          <history value={false}/>
        </>
        `);

      const attributeTokens = tokens
        .filter(
          (token) =>
            token.type === TokenType.AttributeBoolean ||
            token.type === TokenType.AttributeExpression
        )
        .map((token) => token.text);
      expect(attributeTokens).toEqual(["true", "false", "true", "false"]);
    });

    it("should handle attribute values (objects)", () => {
      const tokens = parseToTokens(`
        <state value={{a: 1, b: 2}} />

        `);

      const attributeTokens = tokens
        .filter((token) => token.type === TokenType.AttributeObject)
        .map((token) => token.text);
      expect(attributeTokens).toEqual(["{a: 1, b: 2}"]);
    });

    it("should handle attribute values (arrays)", () => {
      const tokens = parseToTokens(`
        <state value={[1, 2, 3]} />

      `);

      console.log("ddddd tokens", tokens);

      const attributeTokens = tokens
        .filter((token) => token.type === TokenType.AttributeArray)
        .map((token) => token.text);
      expect(attributeTokens).toEqual(["[1, 2, 3]"]);
    });

    it("should handle attribute values (functions)", () => {
      const tokens = parseToTokens(`
        <>
          <state value={() => {
            return "hello";
          }} />
          <parallel value={() => {
            return "delta";
          }} />
          <final value={((input) => {
            return "hello" + input;
          })} />
          <history value={() => {
            return (input) => {
              return "hello" + input;
            };
          }} />
          <history value={() => input} />
        </>
      `);

      const attributeTokens = tokens
        .filter((token) => token.type === TokenType.AttributeFunction)
        .map((token) => token.text);
      expect(attributeTokens).toEqual([
        '() => {\n            return "hello";\n          }',
        '() => {\n            return "delta";\n          }',
        '((input) => {\n            return "hello" + input;\n          })',
        '() => {\n            return (input) => {\n              return "hello" + input;\n            };\n          }',
        "() => input",
      ]);
    });

    it("should handle attribute values (Expressions)", () => {
      const tokens = parseToTokens(`
        <state value={1 + 2} />        
      `);
      const attributeTokens = tokens
        .filter((token) => token.type === TokenType.AttributeExpression)
        .map((token) => token.text);
      expect(attributeTokens).toEqual(["1 + 2"]);
    });
  });
});
