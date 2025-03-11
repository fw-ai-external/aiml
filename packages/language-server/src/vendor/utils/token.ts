import { Token, TokenType } from "../acorn";

/**
 * Interface representing an active token with context
 */
export interface IActiveToken {
  token: Token | null;
  prevToken: Token | null;
  nextToken: Token | null;
  all: Token[];
  index: number;
}

/**
 * Build the active token context from a list of tokens and an offset
 */
export function buildActiveToken(
  tokens: Token[],
  offset: number
): IActiveToken {
  // Find the token at the given offset
  const index = tokens.findIndex(
    (token) => token.startIndex <= offset && token.endIndex >= offset
  );

  return {
    token: index >= 0 ? tokens[index] : null,
    prevToken: index > 0 ? tokens[index - 1] : null,
    nextToken: index < tokens.length - 1 ? tokens[index + 1] : null,
    all: tokens,
    index,
  };
}

/**
 * Get the owner tag name token from a list of tokens and an index
 */
export function getOwnerTagName(tokens: Token[], index: number): Token | null {
  // Find the closest tag name token before the given index
  for (let i = index; i >= 0; i--) {
    if (tokens[i].type === TokenType.TagName) {
      return tokens[i];
    }
  }
  return null;
}

/**
 * Get the owner attribute name token from a list of tokens and an index
 */
export function getOwnerAttributeName(
  tokens: Token[],
  index: number
): Token | null {
  // Find the closest attribute name token before the given index
  for (let i = index; i >= 0; i--) {
    if (tokens[i].type === TokenType.AttributeName) {
      return tokens[i];
    }
  }
  return null;
}
