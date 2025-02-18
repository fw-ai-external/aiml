import { parse as optionsParse } from "oparser";
import { arrayIncludes } from "./utils";
import { fixOpenBracket, ARROW_SYMBOL_PATTERN } from "./utils/find-code";
import { CLOSE_ELEMENT_SYMBOL_PATTERN } from "./utils/find-components";
import {
  CLOSE_BRACKET_PATTERN,
  OPEN_BRACKET_PATTERN,
} from "./utils/find-inline-arrow-fn";
import { Token, PositionRange, ElementNode } from "./types";

interface RootNode {
  tagName: null;
  children: (Token | ElementNode)[];
}

interface StackNode {
  tagName: string | null;
  children: (Token | ElementNode)[];
  position?: PositionRange;
}

interface ParserState {
  tokens: Token[];
  options: {
    closingTags: string[];
    voidTags: string[];
    closingTagAncestorBreakers: Record<string, string[]>;
  };
  cursor: number;
  stack: StackNode[];
}

export function parser(
  tokens: Token[],
  options: ParserState["options"]
): (Token | ElementNode)[] {
  const root: RootNode = { tagName: null, children: [] };
  const state: ParserState = { tokens, options, cursor: 0, stack: [root] };
  parse(state);
  return root.children;
}

function hasTerminalParent(
  tagName: string,
  stack: StackNode[],
  terminals: Record<string, string[]>
): boolean {
  const tagParents = terminals[tagName.toLowerCase()];
  if (tagParents) {
    let currentIndex = stack.length - 1;
    while (currentIndex >= 0) {
      const parentTagName = stack[currentIndex].tagName;
      if (parentTagName?.toLowerCase() === tagName.toLowerCase()) {
        break;
      }
      if (
        parentTagName &&
        arrayIncludes(tagParents, parentTagName.toLowerCase())
      ) {
        return true;
      }
      currentIndex--;
    }
  }
  return false;
}

function rewindStack(
  stack: StackNode[],
  newLength: number,
  childrenEndPosition: PositionRange["start"],
  endPosition: PositionRange["end"]
): void {
  if (stack[newLength].position) {
    stack[newLength].position!.end = endPosition;
  }
  for (let i = newLength + 1, len = stack.length; i < len; i++) {
    if (stack[i].position) {
      stack[i].position!.end = childrenEndPosition;
    }
  }
  stack.splice(newLength);
}

function parse(state: ParserState): void {
  const { tokens, options } = state;
  let { stack } = state;
  let nodes = stack[stack.length - 1].children;
  const len = tokens.length;
  let { cursor } = state;

  while (cursor < len) {
    const token = tokens[cursor];
    if (token.type !== "tag-start") {
      // Always push text, comment, and import tokens
      nodes.push(token);
      cursor++;
      continue;
    }

    const tagToken = tokens[++cursor];
    cursor++;
    if (tagToken.type !== "tag" || !tagToken.content) continue;

    const tagName = tagToken.content;

    if (token.close) {
      let index = stack.length;
      let shouldRewind = false;
      while (--index > -1) {
        if (stack[index].tagName?.toLowerCase() === tagName.toLowerCase()) {
          shouldRewind = true;
          break;
        }
      }
      while (cursor < len) {
        const endToken = tokens[cursor];
        if (endToken.type !== "tag-end") break;
        cursor++;
      }
      if (shouldRewind) {
        rewindStack(
          stack,
          index,
          token.position!.start,
          tokens[cursor - 1].position!.end
        );
        break;
      } else {
        continue;
      }
    }

    const isClosingTag = arrayIncludes(
      options.closingTags,
      tagName.toLowerCase()
    );
    let shouldRewindToAutoClose = isClosingTag;
    if (shouldRewindToAutoClose) {
      const { closingTagAncestorBreakers: terminals } = options;
      shouldRewindToAutoClose = !hasTerminalParent(tagName, stack, terminals);
    }

    if (shouldRewindToAutoClose) {
      let currentIndex = stack.length - 1;
      while (currentIndex > 0) {
        if (
          tagName.toLowerCase() === stack[currentIndex].tagName?.toLowerCase()
        ) {
          rewindStack(
            stack,
            currentIndex,
            token.position!.start,
            token.position!.start
          );
          const previousIndex = currentIndex - 1;
          nodes = stack[previousIndex].children;
          break;
        }
        currentIndex = currentIndex - 1;
      }
    }

    let propsRaw = "";
    let isSelfClosing = false;
    let attrToken: Token;
    while (cursor < len) {
      attrToken = tokens[cursor];
      if (attrToken.type === "tag-end") {
        isSelfClosing = attrToken.isSelfClosing || false;
        break;
      }
      propsRaw = attrToken.src || "";
      cursor++;
    }

    cursor++;
    const children: (Token | ElementNode)[] = [];
    const position: PositionRange = {
      start: token.position!.start,
      end: attrToken!.position!.end,
    };

    const raw = fixOpenBracket(propsRaw.replace(ARROW_SYMBOL_PATTERN, " => "))
      .replace(CLOSE_ELEMENT_SYMBOL_PATTERN, "/>")
      .replace(CLOSE_BRACKET_PATTERN, "}")
      .replace(OPEN_BRACKET_PATTERN, "{");

    const elementNode: ElementNode = {
      type: "element",
      tagName,
      props: raw ? optionsParse(raw) : {},
      propsRaw: raw,
      children,
      position,
    };

    if (isSelfClosing) {
      elementNode.isSelfClosing = isSelfClosing;
    }

    nodes.push(elementNode);

    const hasChildren = !(
      attrToken!.close || arrayIncludes(options.voidTags, tagName.toLowerCase())
    );
    if (hasChildren) {
      const size = stack.push({ tagName, children, position });
      const innerState = { tokens, options, cursor, stack };
      parse(innerState);
      cursor = innerState.cursor;
      const rewoundInElement = stack.length === size;
      if (rewoundInElement) {
        elementNode.position.end = tokens[cursor - 1].position!.end;
      }
    }
  }
  state.cursor = cursor;
}

export type { ElementNode };
export { hasTerminalParent, rewindStack, parse };
