import { describe, test, expect } from "bun:test";
import { TokenType } from "./acorn";
import { parseToTokens } from "./acorn";

describe("parseMDXToTokens", () => {
  test("parses basic MDX content", async () => {
    const mdxContent = `
# Hello World

This is a paragraph with <CustomComponent prop={value}>JSX content</CustomComponent>.

{5 + 5}

import { something } from 'somewhere';
    `;

    const tokens = await parseToTokens(mdxContent);

    // Verify we got tokens
    expect(tokens.length).toBeGreaterThan(0);

    // Verify heading token
    const headingToken = tokens.find((t) => t.type === TokenType.Name);
    expect(headingToken).toBeDefined();
    const headingText = mdxContent.substring(
      headingToken!.startIndex,
      headingToken!.endIndex
    );
    expect(headingText.includes("Hello World")).toBe(true);

    // Verify paragraph token
    const paragraphToken = tokens.find((t) => t.type === TokenType.Paragraph);
    expect(paragraphToken).toBeDefined();
    const paragraphText = mdxContent.substring(
      paragraphToken!.startIndex,
      paragraphToken!.endIndex
    );
    expect(paragraphText.includes("This is a paragraph")).toBe(true);

    // Verify JSX component token
    const jsxToken = tokens.find((t) => t.type === TokenType.TagName);
    expect(jsxToken).toBeDefined();
    const jsxText = mdxContent.substring(
      jsxToken!.startIndex,
      jsxToken!.endIndex
    );
    expect(jsxText.includes("CustomComponent")).toBe(true);

    // Verify expression token
    const exprToken = tokens.find(
      (t) => t.type === TokenType.AttributeExpression
    );
    expect(exprToken).toBeDefined();
    const exprText = mdxContent.substring(
      exprToken!.startIndex,
      exprToken!.endIndex
    );
    expect(exprText.includes("5 + 5")).toBe(true);

    // Verify import/export token
    const importToken = tokens.find(
      (t) => t.type === TokenType.AttributeExpression
    );
    expect(importToken).toBeDefined();
    const importText = mdxContent.substring(
      importToken!.startIndex,
      importToken!.endIndex
    );
    expect(importText.includes("import")).toBe(true);
  });

  test("handles empty content", async () => {
    const tokens = await parseToTokens("");
    expect(tokens).toEqual([]);
  });

  test("handles content with only whitespace", async () => {
    const tokens = await parseToTokens("   \n   ");
    expect(tokens.length).toBe(0);
  });
});
