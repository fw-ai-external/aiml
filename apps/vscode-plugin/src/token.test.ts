import { describe, expect, test } from 'bun:test';
import { TokenType } from './acorn';
import { parseToTokens } from './acorn';

describe('parseMDXToTokens', () => {
  test('parses basic MDX content', async () => {
    const mdxContent = `
# Hello World

This is a paragraph with <CustomComponent prop={value}>JSX content</CustomComponent>.

{5 + 5}

import { something } from 'somewhere';
    `;

    const tokens = await parseToTokens(mdxContent);

    // Verify we got tokens
    expect(tokens.length).toBeGreaterThan(0);

    // Check if we have an error token, which is expected for MDX content
    // since it's not pure JSX
    const errorToken = tokens.find((t) => t.type === TokenType.Invalid);
    expect(errorToken).toBeDefined();

    // If we have a valid JSX token, verify it
    const jsxToken = tokens.find((t) => t.type === TokenType.TagName);
    if (jsxToken) {
      const jsxText = mdxContent.substring(jsxToken.startIndex, jsxToken.endIndex);
      expect(jsxText.includes('CustomComponent')).toBe(true);
    }
  });

  test('handles empty content', async () => {
    const tokens = await parseToTokens('');
    // Empty content results in an Invalid token with an error message
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.Invalid);
    expect(tokens[0].error).toBe('Invalid JSX: No elements found');
  });

  test('handles content with only whitespace', async () => {
    const tokens = await parseToTokens('   \n   ');
    // Whitespace-only content also results in an Invalid token
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.Invalid);
  });
});
