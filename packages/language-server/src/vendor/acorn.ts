export enum TokenType {
  None = "None",
  Invalid = "Invalid",
  Whitespace = "Whitespace",
  Heading = "Heading",
  Paragraph = "Paragraph",
  Comment = "Comment",
  Name = "Name",
  TagName = "TagName",
  AttributeName = "AttributeName",
  AttributeString = "AttributeString",
  AttributeExpression = "AttributeExpression",
  AttributeBoolean = "AttributeBoolean",
  AttributeNumber = "AttributeNumber",
  AttributeObject = "AttributeObject",
  AttributeArray = "AttributeArray",
  AttributeFunction = "AttributeFunction",
  StartTag = "StartTag",
  SimpleEndTag = "SimpleEndTag",
  EndTag = "EndTag",
  StartEndTag = "StartEndTag",
  Equal = "Equal",
}

export interface Token {
  index: number;
  type: TokenType;
  startIndex: number;
  endIndex: number;
  raw: string;
  text: string;
  error?: string | { code: number; message: string };
  children?: Token[];
}

/**
 * Parse content into tokens
 */
export function parseToTokens(content: string): Token[] {
  // This is a simplified implementation
  // The actual implementation would use a proper parser
  return [];
}

/**
 * Build the active token from a list of tokens and an offset
 */
export function buildActiveToken(
  tokens: Token[],
  offset: number
): { token: Token | null; all: Token[]; index: number } {
  // Find the token at the given offset
  const index = tokens.findIndex(
    (token) => token.startIndex <= offset && token.endIndex >= offset
  );

  return {
    token: index >= 0 ? tokens[index] : null,
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
