import { CodeBlock } from "../types";

export const REP_SYMBOL = "◊";
export const REP_SYMBOL_PATTERN = /◊/g;
export const ARROW_SYMBOL = "_≡►_";
export const ARROW_SYMBOL_PATTERN = /_≡►_/g;

// https://regex101.com/r/nIlW1U/6
export const CODE_BLOCK_REGEX =
  /^([A-Za-z \t]*)```([A-Za-z]*)?\n([\s\S]*?)```([A-Za-z \t]*)*$/gm;
// https://regex101.com/r/oPKKoC/1
export const REMOVE_CODE_BLOCK_REGEX =
  /^(?:[A-Za-z \t]*)?(```(?:[A-Za-z]*)?\n(?:[\s\S]*?)```)([A-Za-z \t]*)*$/gm;
// https://regex101.com/r/9bmDHe/7
export const CODE_INLINE_REGEX =
  /(^`((?:\\`|[^`])*)+`|([^\\\n])`((?:\\`|[^`])*)`)/gm;
export const STARTS_WITH_FENCE = /^`{2,}/;

/**
 * Parse code blocks out of markdown
 * @param md - markdown string
 * @returns Array of code blocks
 * @example
 * const blocks = findCodeBlocks(content)
 * console.log('blocks', blocks)
 */
export function findCodeBlocks(md: string = ""): CodeBlock[] {
  let matches: RegExpExecArray | null;
  const blocks: CodeBlock[] = [];
  while ((matches = CODE_BLOCK_REGEX.exec(md)) !== null) {
    if (matches.index === CODE_BLOCK_REGEX.lastIndex) {
      CODE_BLOCK_REGEX.lastIndex++; // avoid infinite loops with zero-width matches
    }
    const [match, prefix, syntax, content, postFix] = matches;

    blocks.push({
      index: matches.index,
      syntax: syntax || "",
      block: match,
      code: content.trim(),
    });
  }

  return blocks;
}

/**
 * Parse inline code blocks out of markdown
 * @param md - markdown string
 * @returns Array of code blocks
 * @example
 * const blocks = findCodeBlocks(content)
 * console.log('blocks', blocks)
 */
export function findInlineCode(md: string = ""): CodeBlock[] {
  let matches: RegExpExecArray | null;
  const blocks: CodeBlock[] = [];
  while ((matches = CODE_INLINE_REGEX.exec(md)) !== null) {
    if (matches.index === CODE_INLINE_REGEX.lastIndex) {
      CODE_INLINE_REGEX.lastIndex++; // avoid infinite loops with zero-width matches
    }
    const [match, _fullMatch, innerOne, space, innerTwo] = matches;
    const content = innerOne || innerTwo;

    if (
      content &&
      content.indexOf("\n") === -1 &&
      !STARTS_WITH_FENCE.test(content)
    ) {
      blocks.push({
        index: space ? matches.index + 1 : matches.index,
        block: space ? match.substring(1) : match,
        code: content.trim(),
      });
    }
  }

  return blocks;
}

/**
 * Parse all code blocks out of markdown
 * @param md - markdown string
 * @returns Array of code blocks
 * @example
 * const blocks = findCodeBlocks(content)
 * console.log('blocks', blocks)
 */
export function findCode(md: string = ""): CodeBlock[] {
  return findInlineCode(md);
}

export function fixOpenBracket(content: string = ""): string {
  return content.indexOf(REP_SYMBOL) === -1
    ? content
    : content.replace(REP_SYMBOL_PATTERN, "<");
}
