import {
  startsWith,
  endsWith,
  stringIncludes,
  arrayIncludes,
  getTextBetweenChars,
} from "./utils";
import {
  fixOpenBracket,
  ARROW_SYMBOL,
  ARROW_SYMBOL_PATTERN,
} from "./utils/find-code";
import { CLOSE_ELEMENT_SYMBOL_PATTERN } from "./utils/find-components";
import {
  CLOSE_BRACKET_PATTERN,
  OPEN_BRACKET_PATTERN,
} from "./utils/find-inline-arrow-fn";
import { Position, Token, LexerState, LexerOptions } from "./types";

function feedPosition(position: Position, str: string, len: number): void {
  const start = position.index;
  const end = (position.index = start + len);
  for (let i = start; i < end; i++) {
    const char = str.charAt(i);
    if (char === "\n") {
      position.line++;
      position.column = 0;
    } else {
      position.column++;
    }
  }
}

function jumpPosition(position: Position, str: string, end: number): void {
  const len = end - position.index;
  feedPosition(position, str, len);
}

function makeInitialPosition(): Position {
  return {
    index: 0,
    column: 1,
    line: 1,
  };
}

function copyPositionStart(position: Position): Position {
  return {
    index: position.index,
    line: position.line,
    column: !position.column ? position.column + 1 : position.column,
  };
}

function copyPositionEnd(position: Position): Position {
  return {
    index: position.index,
    line: position.line,
    column: !position.column ? position.column + 1 : position.column,
  };
}

function copyPosition(position: Position): Position {
  return {
    index: position.index,
    line: position.line,
    column: position.column,
  };
}

function isMarkdownHeader(str: string): boolean {
  return /^#+ /.test(str);
}

function isImportStatement(str: string): boolean {
  return /^import\s/.test(str);
}

function lexImport(state: LexerState): void {
  const { str, position } = state;
  const start = copyPositionStart(position);

  // Find the end of the import statement (newline or end of string)
  const lineEnd = str.indexOf("\n", position.index);
  const end = lineEnd === -1 ? str.length : lineEnd;
  const importStr = str.slice(position.index, end);

  // Parse the import statement
  const sourceMatch = importStr.match(/from\s+['"]([^'"]+)['"]/);
  const source = sourceMatch ? sourceMatch[1] : "";

  // Handle default and named imports
  const specifiers = [];

  // Check for default import
  const defaultMatch = importStr.match(/import\s+([^{,\s]+)\s+from/);
  if (defaultMatch) {
    specifiers.push({
      type: "default" as const,
      local: defaultMatch[1],
    });
  }

  // Check for named imports
  const namedMatch = importStr.match(/{\s*([^}]+)\s*}/);
  if (namedMatch) {
    const imports = namedMatch[1].split(",").map((s) => s.trim());
    for (const imp of imports) {
      const [imported, local] = imp.split(/\s+as\s+/).map((s) => s.trim());
      specifiers.push({
        type: "named" as const,
        imported: local ? imported : undefined,
        local: local || imported,
      });
    }
  }

  state.tokens.push({
    type: "import",
    source,
    specifiers,
    position: {
      start,
      end: {
        index: end,
        line: position.line,
        column: position.column + (end - position.index),
      },
    },
  });

  // Update position
  jumpPosition(position, str, end);
  if (lineEnd !== -1) {
    // Move past the newline
    feedPosition(position, str, 1);
  }
}

function lexer(str: string, options: LexerOptions): Token[] {
  const state: LexerState = {
    str,
    options,
    position: makeInitialPosition(),
    tokens: [],
  };
  lex(state);
  return state.tokens;
}

function lex(state: LexerState): void {
  const {
    str,
    options: { childlessTags },
  } = state;
  const len = str && str.length ? str.length : 0;
  while (state.position.index < len) {
    const start = state.position.index;
    const char = str.charAt(start);
    const restOfLine = str.slice(start, str.indexOf("\n", start));

    // Check for import statements
    if (char === "i" && isImportStatement(restOfLine)) {
      lexImport(state);
      continue;
    }

    // Check for markdown header at start of line
    if (char === "#" || (char === "\n" && str.charAt(start + 1) === "#")) {
      const lineStart = char === "\n" ? start + 1 : start;
      const lineEnd = str.indexOf("\n", lineStart);
      const line = str.slice(lineStart, lineEnd === -1 ? str.length : lineEnd);
      if (isMarkdownHeader(line)) {
        if (char === "\n") {
          state.tokens.push({
            type: "text",
            content: "\n",
            position: {
              start: copyPosition(state.position),
              end: {
                index: start + 1,
                line: state.position.line + 1,
                column: 1,
              },
            },
          });
          state.position.line++;
          state.position.column = 1;
          state.position.index = start + 1;
        }

        state.tokens.push({
          type: "text",
          content: line,
          position: {
            start: copyPosition(state.position),
            end: {
              index: lineEnd === -1 ? str.length : lineEnd,
              line: state.position.line,
              column: state.position.column + line.length,
            },
          },
        });

        state.position.index = lineEnd === -1 ? str.length : lineEnd;
        if (lineEnd !== -1) {
          state.position.line++;
          state.position.column = 1;
        }
        continue;
      }
    }

    if (char === "<") {
      const isComment = startsWith(str, "!--", start + 1);
      if (isComment) {
        lexComment(state);
      } else {
        const tagName = lexTag(state);
        const safeTag = tagName.toLowerCase();
        if (arrayIncludes(childlessTags, safeTag)) {
          lexSkipTag(tagName, state);
        }
      }
    } else {
      lexText(state);
    }
  }
}

const alphanumeric = /[A-Za-z0-9]/;
function findTextEnd(str: string, index: number): number {
  while (true) {
    const textEnd = str.indexOf("<", index);
    if (textEnd === -1) {
      return textEnd;
    }
    const char = str.charAt(textEnd + 1);
    if (char === "/" || char === "!" || alphanumeric.test(char)) {
      return textEnd;
    }
    index = textEnd + 1;
  }
}

function lexText(state: LexerState): void {
  const { str, position } = state;
  let textEnd = findTextEnd(str, position.index);
  if (textEnd === position.index) return;
  if (textEnd === -1) {
    textEnd = str.length;
  }

  const start = copyPositionStart(position);
  const content = str.slice(position.index, textEnd);
  jumpPosition(position, str, textEnd);
  const end = copyPositionEnd(position);

  // Only skip pure whitespace text nodes that don't contain newlines
  if (!/^\s+$/.test(content) || content.includes("\n")) {
    state.tokens.push({
      type: "text",
      content: fixOpenBracket(content)
        .replace(CLOSE_ELEMENT_SYMBOL_PATTERN, "/>")
        .replace(CLOSE_BRACKET_PATTERN, "}")
        .replace(OPEN_BRACKET_PATTERN, "{"),
      position: { start, end },
    });
  }
}

function lexComment(state: LexerState): void {
  const { str, position } = state;
  const start = copyPositionStart(position);
  feedPosition(position, str, 4); // "<!--".length
  let contentEnd = str.indexOf("-->", position.index);
  let commentEnd = contentEnd + 3; // "-->".length
  if (contentEnd === -1) {
    contentEnd = commentEnd = str.length;
  }

  const content = str.slice(position.index, contentEnd);
  jumpPosition(position, str, commentEnd);
  state.tokens.push({
    type: "comment",
    content,
    position: {
      start,
      end: copyPositionEnd(position),
    },
  });
}

function lexTag(state: LexerState): string {
  const { str, position } = state;
  {
    const secondChar = str.charAt(position.index + 1);
    const close = secondChar === "/";
    const start = copyPositionStart(position);
    feedPosition(position, str, close ? 2 : 1);
    state.tokens.push({
      type: "tag-start",
      close,
      position: { start, end: copyPosition(position) },
    });
    state._tagStart = start.index;
  }
  const tagName = lexTagName(state);
  lexTagAttributes(state, tagName);
  {
    const firstChar = str.charAt(position.index);
    const close = firstChar === "/";
    feedPosition(position, str, close ? 2 : 1);
    const end = copyPositionEnd(position);
    const tagOpen = getTextBetweenChars(str, state._tagStart!, end.index);
    const endToken: Token = {
      type: "tag-end",
      close,
      position: { start: copyPosition(position), end },
    };
    if (tagOpen.indexOf("/>") > -1) {
      endToken.isSelfClosing = true;
    }
    state.tokens.push(endToken);
  }
  return tagName;
}

const whitespace = /[^\S\r]/;
function isWhitespaceChar(char: string): boolean {
  return whitespace.test(char);
}

function lexTagName(state: LexerState): string {
  const { str, position } = state;
  const len = str.length;
  let start = position.index;
  while (start < len) {
    const char = str.charAt(start);
    const isTagChar = !(isWhitespaceChar(char) || char === "/" || char === ">");
    if (isTagChar) break;
    start++;
  }

  let end = start + 1;
  while (end < len) {
    const char = str.charAt(end);
    const isTagChar = !(isWhitespaceChar(char) || char === "/" || char === ">");
    if (!isTagChar) break;
    end++;
  }

  jumpPosition(position, str, end);
  const tagName = str.slice(start, end);
  state.tokens.push({
    type: "tag",
    content: tagName,
  });
  return tagName;
}

function lexTagAttributes(state: LexerState, tagName: string): void {
  let rawAttrs = "";
  const { str, position, tokens } = state;
  let cursor = position.index;
  let quote: string | null = null;
  let wordBegin = cursor;
  const words: string[] = [];

  const len = str.length;
  let prevWasClose = false;
  while (cursor < len) {
    const char = str.charAt(cursor);

    rawAttrs += char;

    if (quote === "{" && char === "}") {
      const isQuoteEnd = isBalanced(str.slice(wordBegin, cursor + 1));
      if (isQuoteEnd) {
        quote = null;
      }
      cursor = cursor + 1;
      prevWasClose = true;
      continue;
    }

    if (quote) {
      const isQuoteEnd = char === quote;
      if (isQuoteEnd) {
        quote = null;
      }
      cursor++;
      prevWasClose = true;
      continue;
    }

    if (prevWasClose && char === "\n") {
      if (cursor !== wordBegin) {
        words.push(str.slice(wordBegin, cursor));
      }
      wordBegin = cursor + 1;
      cursor++;
      prevWasClose = false;
      continue;
    }

    const isTagEnd = char === "/" || char === ">";
    if (isTagEnd) {
      if (cursor !== wordBegin) {
        words.push(str.slice(wordBegin, cursor));
      }
      break;
    }

    const isWordEnd = isWhitespaceChar(char);
    if (isWordEnd) {
      if (cursor !== wordBegin) {
        words.push(str.slice(wordBegin, cursor));
      }
      wordBegin = cursor + 1;
      cursor++;
      continue;
    }

    const isQuoteStart = char === "'" || char === '"' || char === "`";
    if (isQuoteStart) {
      quote = char;
      cursor++;
      continue;
    }

    const isBracketStart = char === "{";
    if (isBracketStart) {
      quote = char;
      cursor++;
      continue;
    }

    cursor++;
  }
  jumpPosition(position, str, cursor);

  const src = rawAttrs.replace(/\/?>?$/, "");

  const wLen = words.length;
  const type = "attribute";
  for (let i = 0; i < wLen; i++) {
    const word = words[i];
    const isNotPair = word.indexOf("=") === -1;
    if (isNotPair) {
      const secondWord = words[i + 1];
      if (secondWord && startsWith(secondWord, "=")) {
        if (secondWord.length > 1) {
          const newWord = word + secondWord;
          tokens.push({
            type,
            content: newWord,
            src,
          });
          i += 1;
          continue;
        }
        const thirdWord = words[i + 2];
        i += 1;
        if (thirdWord) {
          const newWord = word + "=" + thirdWord;
          tokens.push({
            type,
            content: newWord,
            src,
          });
          i += 1;
          continue;
        }
      }
    }
    if (endsWith(word, "=")) {
      const secondWord = words[i + 1];
      if (secondWord && !stringIncludes(secondWord, "=")) {
        const newWord = word + secondWord;
        tokens.push({
          type,
          content: newWord,
          src,
        });
        i += 1;
        continue;
      }

      const newWord = word.slice(0, -1);
      tokens.push({
        type,
        content: newWord,
        src,
      });
      continue;
    }

    if (word !== "\n") {
      tokens.push({
        type,
        content:
          word.indexOf(ARROW_SYMBOL) === -1
            ? word
            : word.replace(ARROW_SYMBOL_PATTERN, " => "),
        src,
      });
    }
  }
}

function isBalanced(str: string): boolean {
  return !str.split("").reduce((uptoPrevChar: number, thisChar: string) => {
    if (thisChar === "(" || thisChar === "{" || thisChar === "[") {
      return ++uptoPrevChar;
    } else if (thisChar === ")" || thisChar === "}" || thisChar === "]") {
      return --uptoPrevChar;
    }
    return uptoPrevChar;
  }, 0);
}

function lexSkipTag(tagName: string, state: LexerState): void {
  const { str, position, tokens } = state;
  const safeTagName = tagName.toLowerCase();
  const len = str.length;
  let index = position.index;
  while (index < len) {
    const nextTag = str.indexOf("</", index);
    if (nextTag === -1) {
      lexText(state);
      break;
    }

    const tagStartPosition = copyPositionStart(position);
    jumpPosition(tagStartPosition, str, nextTag);
    const tagState: LexerState = {
      str,
      position: tagStartPosition,
      tokens: [],
      options: state.options,
    };
    const name = lexTag(tagState);
    if (safeTagName !== name.toLowerCase()) {
      index = tagState.position.index;
      continue;
    }

    if (nextTag !== position.index) {
      const textStart = copyPositionStart(position);
      jumpPosition(position, str, nextTag);
      tokens.push({
        type: "text",
        content: str
          .slice(textStart.index, nextTag)
          .replace(CLOSE_BRACKET_PATTERN, "}")
          .replace(OPEN_BRACKET_PATTERN, "{"),
        position: {
          start: textStart,
          end: copyPositionEnd(position),
        },
      });
    }

    tokens.push(...tagState.tokens);
    jumpPosition(position, str, tagState.position.index);
    break;
  }
}

export {
  feedPosition,
  jumpPosition,
  makeInitialPosition,
  copyPosition,
  lexer,
  lex,
  findTextEnd,
  lexText,
  lexTag,
  lexComment,
  isWhitespaceChar,
  lexTagName,
  lexTagAttributes,
  lexSkipTag,
};
