export const OPEN_BRACKET = "◖";
export const OPEN_BRACKET_PATTERN = /◖/g;
export const CLOSE_BRACKET = "◗";
export const CLOSE_BRACKET_PATTERN = /◗/g;

export const ARROW_FN_REGEX =
  /([{ ])(?:async\s+)?\s?\(.*\)\s?=>\s?\{(?:(?:[^}{]+|\{(?:[^}{]+|\{[^}{]*\})*\})*\}(?:\s?\(.*\)\s?\)\s?)?)?(?:\;)?/gim;

export function findArrowFns(block: string): string[] {
  let matches: RegExpExecArray | null;
  const fns: string[] = [];
  while ((matches = ARROW_FN_REGEX.exec(block)) !== null) {
    if (matches.index === ARROW_FN_REGEX.lastIndex) {
      ARROW_FN_REGEX.lastIndex++; // avoid infinite loops with zero-width matches
    }
    const [_match, openChar] = matches;
    fns.push(_match.replace(openChar || "", ""));
  }
  return fns;
}
