import { type Token, TokenType } from '../acorn';

export interface IActiveToken {
  all: Array<Token>;
  prevToken?: Token;
  token?: Token;
  /** 活动的 Token，活动点 == endIndex */
  activeEndToken?: Token;
  index: number;
}

export function getTokenLen(token: Token) {
  return token.endIndex - token.startIndex;
}

export function getAllAttributeNames(content: string, tokens: Array<Token>, tokenStart: number) {
  let names: Array<string> = [];
  let index = tokenStart;
  while (index < tokens.length) {
    let token = tokens[index];
    let prevToken = tokens[index - 1];
    if (
      (prevToken.type == TokenType.Name || prevToken.type == TokenType.AttributeName) &&
      token.type == TokenType.Equal
    ) {
      names.push(content.substring(prevToken.startIndex, prevToken.endIndex).toUpperCase());
    } else if (
      prevToken.type == TokenType.StartTag ||
      prevToken.type == TokenType.EndTag ||
      prevToken.type == TokenType.StartEndTag ||
      prevToken.type == TokenType.SimpleEndTag
    ) {
      break;
    }
    index++;
  }
  return names;
}

export function getOwnerAttributeName(tokens: Array<Token>, index: number): Token | null {
  // First check if we're already on an attribute name
  if (
    index < tokens.length &&
    (tokens[index].type === TokenType.AttributeName || tokens[index].type === TokenType.Name)
  ) {
    return tokens[index];
  }

  // Otherwise look backwards for the previous attribute name
  while (index >= 1) {
    let token = tokens[index];
    let prevToken = tokens[index - 1];
    if (prevToken.type === TokenType.AttributeName || prevToken.type === TokenType.Name) {
      return prevToken;
    } else if (
      prevToken.type === TokenType.StartTag ||
      prevToken.type === TokenType.EndTag ||
      prevToken.type === TokenType.StartEndTag ||
      prevToken.type === TokenType.SimpleEndTag
    ) {
      break;
    }
    index--;
  }
  return null;
}

export function getOwnerTagName(tokens: Array<Token>, index: number): Token | null {
  while (index >= 1) {
    let token = tokens[index];
    let prevToken = tokens[index - 1];
    if (token.type == TokenType.SimpleEndTag) {
      return null;
    } else if (token.type == TokenType.TagName && prevToken.type == TokenType.StartTag) {
      return token;
    } else if (token.type == TokenType.TagName && prevToken.type == TokenType.StartEndTag) {
      return null;
    }
    index--;
  }
  return null;
}

export function getParentTagName(tokens: Array<Token>, index: number): Token | null {
  let depth = 0;
  while (index >= 1) {
    let token = tokens[index];
    let prevToken = tokens[index - 1];
    if (token.type == TokenType.SimpleEndTag) {
      // />
      depth++;
    } else if (token.type == TokenType.TagName && prevToken.type == TokenType.StartTag) {
      // <Tag
      depth--;
      if (depth < 0) {
        return token;
      }
    } else if (token.type == TokenType.TagName && prevToken.type == TokenType.StartEndTag) {
      // </
      depth++;
    }
    index--;
  }
  return null;
}

export function buildActiveToken(tokens: Token[], offset: number): IActiveToken {
  let activeToken: Token | undefined;
  let prevToken: Token | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (offset >= token.startIndex && offset <= token.endIndex) {
      activeToken = token;
      prevToken = tokens[i - 1];
      break;
    }
    // Handle case where cursor is between tokens
    if (offset < token.startIndex) {
      activeToken = {
        type: TokenType.None,
        startIndex: offset,
        endIndex: offset,
        index: i,
        raw: token.raw,
        text: token.text,
      };
      prevToken = tokens[i - 1];
      break;
    }
  }

  // Handle cursor at end of document
  if (!activeToken && tokens.length > 0) {
    prevToken = tokens[tokens.length - 1];
    activeToken = {
      type: TokenType.None,
      startIndex: offset,
      endIndex: offset,
      index: tokens.length,
      raw: prevToken?.raw ?? '',
      text: prevToken?.text ?? '',
    };
  }

  return {
    token: activeToken,
    prevToken,
    all: tokens,
    index: activeToken?.index ?? tokens.length,
  };
}

export function getJSXExpressionValue(tokens: Token[], index: number): Token | null {
  let depth = 0;
  while (index >= 1) {
    let token = tokens[index];
    if (token.type == TokenType.SimpleEndTag) {
      return null;
    }
  }
  return null;
}
