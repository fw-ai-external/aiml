import { Connection, TextDocument } from "vscode-languageserver";

export enum TokenType {
  None,
  Invalid,
  Whitespace,
  String, // "..."
  Comment, // <!-- ... -->
  Name, // any element or attribute name (for example, `svg`, `rect`, `width`)
  TagName, // any element or attribute name (for example, `svg`, `rect`, `width`)
  AttributeName, // any attribute name (for example, `id`, `class`, `style`)
  AttributeStringValue, // any attribute value (for example, `"100"`, `"red"`, `"100px"`)
  AttributeJSValue, // any attribute value (for example, `{true ? "yes" : "no"}`, `{false}`, `{100}`, or multiple lines of code between `{` and `}`)
  StartTag, // <
  SimpleEndTag, // />
  EndTag, // >
  StartEndTag, // </
  Equal, // =
  JSXExpressionStart = 100, // {
  JSXExpressionEnd = 101, // }
  JSXValue = 102, // true/false/etc inside {}
}

export interface Token {
  index: number;
  type: TokenType;
  startIndex: number;
  endIndex: number;
  error?: string | { code: number; message: string };
}

export function getTokenLen(token: Token) {
  return token.endIndex - token.startIndex;
}

const NO_OUTPUT_WHITE_TOKEN = false;

let spaceRegex = /^[ \r\n\t\f]+/;
let commentRegex = /^<!--.*?-->/s;
let nameRegex = /^[a-zA-Z0-9\-:]+/;
let startTagRegex = /^</;
let endTagRegex = /^>/;
let simpleEndTagRegex = /^\/>/;
let startEndTagRegex = /^<\//;
let equalRegex = /^=/;
let stringRegex = /^".*?"/s;
let templateStringRegex = /^`.*?`/s;

let jsattributeValueRegex = /^`.*?`/; // `{true ? "yes" : "no"}`
let attributeNameRegex =
  /^[a-zA-Z0-9\-:]+(?:\s*=\s*(?:"[^"]*"|{(?:[^{}]|{[^{}]*})*}))?/;

const jsxExpressionStartRegex = /^{/;
const jsxExpressionEndRegex = /^}/;
const jsxValueRegex = /^(true|false|null|undefined|\d+)/;

export function getTokens(connection: Connection, content: string) {
  let tokens: Array<Token> = [];
  let pos = 0;

  let lastToken: Token | null = null;
  let regexTest = (reg: RegExp, tokenType: TokenType) => {
    let lifeContent = content.substring(pos);
    let r = lifeContent.match(reg);
    if (r) {
      let startIndex = pos;
      pos = startIndex + r[0].length;
      let token = {
        index: tokens.length,
        type: tokenType,
        startIndex: startIndex,
        endIndex: pos,
      };
      if (NO_OUTPUT_WHITE_TOKEN && tokenType == TokenType.Whitespace) {
        return true;
      }
      tokens.push((lastToken = token));
      // connection.console.log("" + (tokens.length - 1) + ":" + tokenType + ":" + content.substring(token.startIndex, token.endIndex));
      return true;
    }
    return false;
  };
  let getLastTokenNoWitespace = () => {
    let idx = tokens.length;
    while (idx > 0) {
      idx--;
      if (tokens[idx].type != TokenType.Whitespace) {
        return tokens[idx];
      }
    }
  };
  let nameTest = (reg: RegExp) => {
    let lifeContent = content.substring(pos);
    let r = lifeContent.match(nameRegex);
    if (r) {
      let startIndex = pos;
      pos = startIndex + r[0].length;
      let tokenType = TokenType.Name;
      let lt = getLastTokenNoWitespace();
      if (lastToken && lt) {
        if (
          lastToken.type == TokenType.StartTag ||
          lastToken.type == TokenType.StartEndTag
        ) {
          tokenType = TokenType.TagName;
        } else if (
          lt.type == TokenType.String ||
          lt.type == TokenType.TagName
        ) {
          tokenType = TokenType.AttributeName;
        }
      }
      let token = {
        index: tokens.length,
        type: tokenType,
        startIndex: startIndex,
        endIndex: pos,
      };
      tokens.push((lastToken = token));
      return true;
    }
    return false;
  };

  while (pos < content.length) {
    let readed =
      regexTest(spaceRegex, TokenType.Whitespace) ||
      regexTest(commentRegex, TokenType.Comment) ||
      regexTest(jsxExpressionStartRegex, TokenType.JSXExpressionStart) ||
      regexTest(jsxExpressionEndRegex, TokenType.JSXExpressionEnd) ||
      regexTest(jsxValueRegex, TokenType.JSXValue) ||
      nameTest(nameRegex) ||
      regexTest(startEndTagRegex, TokenType.StartEndTag) ||
      regexTest(endTagRegex, TokenType.EndTag) ||
      regexTest(simpleEndTagRegex, TokenType.SimpleEndTag) ||
      // regexTest(jsattributeValueRegex, TokenType.AttributeJSValue) ||
      // regexTest(attributeStringValueRegex, TokenType.AttributeStringValue) ||
      regexTest(attributeNameRegex, TokenType.AttributeName) ||
      regexTest(startTagRegex, TokenType.StartTag) ||
      regexTest(stringRegex, TokenType.String) ||
      regexTest(equalRegex, TokenType.Equal);
    if (!readed) {
      // TODO Create INVALID or add to last INVALID Token.
      tokens.push({
        index: tokens.length,
        type: TokenType.Invalid,
        startIndex: pos,
        endIndex: ++pos,
      });
    }
  }

  return tokens;
}

export interface IActiveToken {
  all: Array<Token>;
  prevToken?: Token;
  token?: Token;
  /** 活动的 Token，活动点 == endIndex */
  activeEndToken?: Token;
  index: number;
}

export function getAllAttributeNames(
  content: string,
  tokens: Array<Token>,
  tokenStart: number
) {
  let names: Array<string> = [];
  let index = tokenStart;
  while (index < tokens.length) {
    let token = tokens[index];
    let prevToken = tokens[index - 1];
    if (prevToken.type == TokenType.Name && token.type == TokenType.Equal) {
      names.push(
        content
          .substring(prevToken.startIndex, prevToken.endIndex)
          .toUpperCase()
      );
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

export function getOwnerAttributeName(
  tokens: Array<Token>,
  index: number
): Token | null {
  while (index >= 1) {
    let token = tokens[index];
    let prevToken = tokens[index - 1];
    if (
      prevToken.type == TokenType.AttributeName ||
      prevToken.type == TokenType.Name
    ) {
      return prevToken;
    } else if (
      prevToken.type == TokenType.StartTag ||
      prevToken.type == TokenType.EndTag ||
      prevToken.type == TokenType.StartEndTag ||
      prevToken.type == TokenType.SimpleEndTag
    ) {
      break;
    }
    index--;
  }
  return null;
}

export function getOwnerTagName(
  tokens: Array<Token>,
  index: number
): Token | null {
  while (index >= 1) {
    let token = tokens[index];
    let prevToken = tokens[index - 1];
    if (token.type == TokenType.SimpleEndTag) {
      return null;
    } else if (
      token.type == TokenType.TagName &&
      prevToken.type == TokenType.StartTag
    ) {
      return token;
    } else if (
      token.type == TokenType.TagName &&
      prevToken.type == TokenType.StartEndTag
    ) {
      return null;
    }
    index--;
  }
  return null;
}

export function getParentTagName(
  tokens: Array<Token>,
  index: number
): Token | null {
  let depth = 0;
  while (index >= 1) {
    let token = tokens[index];
    let prevToken = tokens[index - 1];
    if (token.type == TokenType.SimpleEndTag) {
      // />
      depth++;
    } else if (
      token.type == TokenType.TagName &&
      prevToken.type == TokenType.StartTag
    ) {
      // <Tag
      depth--;
      if (depth < 0) {
        return token;
      }
    } else if (
      token.type == TokenType.TagName &&
      prevToken.type == TokenType.StartEndTag
    ) {
      // </
      depth++;
    }
    index--;
  }
  return null;
}

let tokenCaches: { [uri: string]: { version: number; tokens: Array<Token> } } =
  {};

function getCacheTokens(doc: TextDocument | null) {
  if (doc && doc.uri in tokenCaches) {
    if (tokenCaches[doc.uri].version == doc.version) {
      return tokenCaches[doc.uri].tokens;
    }
  }
  return null;
}

export function buildActiveToken(
  tokens: Token[],
  offset: number
): IActiveToken {
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
    };
  }

  return {
    token: activeToken,
    prevToken,
    all: tokens,
    index: activeToken?.index ?? tokens.length,
  };
}
