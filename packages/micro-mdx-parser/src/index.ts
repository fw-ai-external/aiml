import { lexer } from "./lexer";
import { parser } from "./parser";
import { format } from "./format";
import { validator } from "./validate";
import { toHTML } from "./stringify";
import {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
} from "./tags";
import { ElementNode, ImportNode, Token } from "./types";

const defaultOptions = {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
  includePositions: true,
};

export function parse(str: string): (ElementNode | ImportNode)[] {
  const tokens = lexer(str, defaultOptions);
  const ast = parser(tokens, defaultOptions);
  return format(ast, defaultOptions, str);
}

export function parseToJson(str: string, pretty = false): string {
  const ast = parse(str);
  return JSON.stringify(ast, null, pretty ? 2 : undefined);
}

export function stringify(
  ast: ElementNode[],
  options = defaultOptions
): string {
  return toHTML(ast, { voidTags: options.voidTags });
}

export interface ValidationResult {
  message: string;
  value: string;
}

export function validate(ast: ElementNode[]): ValidationResult[] {
  return validator(ast, {});
}

export type { ElementNode, Token };
export { lexer, parser, format, toHTML, validator };
