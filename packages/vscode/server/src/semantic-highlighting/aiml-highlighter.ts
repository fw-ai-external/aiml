import type { SemanticTokensBuilder } from "vscode-languageserver/node";
import { SemanticTokenTypes, SemanticTokenModifiers } from "./types";
import {
  getElementTokenType,
  getElementModifiersForName,
  getAttributeValueTokenTypeFromText,
} from "./utils";

/**
 * Highlight AIML element tags
 */
export function highlightElements(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  // Match opening and closing tags
  const elementRegex = /<\/?(\w+)(?:\s|>|\/)/g;
  let match: RegExpExecArray | null;

  while ((match = elementRegex.exec(line)) !== null) {
    const elementName = match[1];
    const tokenType = getElementTokenType(elementName);
    const modifiers = getElementModifiersForName(elementName);

    builder.push(
      lineIndex,
      match.index + (match[0].startsWith("</") ? 2 : 1), // Account for </ or <
      elementName.length,
      tokenType,
      modifiers
    );
  }
}

/**
 * Highlight element attributes
 */
export function highlightAttributes(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  // Match attribute="value" patterns
  const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(line)) !== null) {
    const attrName = match[1];
    const attrValue = match[2];

    // Highlight attribute name
    builder.push(
      lineIndex,
      match.index,
      attrName.length,
      SemanticTokenTypes.PARAMETER,
      1 << SemanticTokenModifiers.DECLARATION
    );

    // Highlight attribute value
    const valueStart = match.index + match[0].indexOf('"') + 1;
    const valueTokenType = getAttributeValueTokenTypeFromText(
      attrName,
      attrValue
    );

    builder.push(lineIndex, valueStart, attrValue.length, valueTokenType, 0);
  }
}

/**
 * Highlight AIML expressions
 */
export function highlightExpressions(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  // Match {expression} patterns
  const exprRegex = /\{[^}]*\}/g;
  let match: RegExpExecArray | null;

  while ((match = exprRegex.exec(line)) !== null) {
    builder.push(
      lineIndex,
      match.index,
      match[0].length,
      SemanticTokenTypes.PROPERTY,
      1 << SemanticTokenModifiers.DECLARATION
    );
  }
}

/**
 * Highlight AIML comments
 */
export function highlightAIMLComments(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  // Match {/* comment */} patterns
  const commentRegex = /\{\/\*.*?\*\/\}/g;
  let match: RegExpExecArray | null;

  while ((match = commentRegex.exec(line)) !== null) {
    builder.push(
      lineIndex,
      match.index,
      match[0].length,
      SemanticTokenTypes.COMMENT,
      1 << SemanticTokenModifiers.DOCUMENTATION
    );
  }

  // Match <!-- comment --> patterns
  const htmlCommentRegex = /<!--.*?-->/g;
  while ((match = htmlCommentRegex.exec(line)) !== null) {
    builder.push(
      lineIndex,
      match.index,
      match[0].length,
      SemanticTokenTypes.COMMENT,
      1 << SemanticTokenModifiers.DOCUMENTATION
    );
  }
}
