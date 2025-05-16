import {
  type CompletionItem,
  CompletionItemKind,
  type Position,
  type TextDocument,
} from "vscode-languageserver";

// Define AIML element tags manually for now
// This is a temporary solution until we can properly import from the shared package
const AIML_ELEMENTS = [
  "workflow",
  "state",
  "parallel",
  "final",
  "datamodel",
  "data",
  "assign",
  "onentry",
  "onexit",
  "transition",
  "if",
  "elseif",
  "else",
  "foreach",
  "script",
  "llm",
  "toolcall",
  "log",
  "sendText",
  "sendToolCalls",
  "sendObject",
  "onerror",
  "onchunk",
  "prompt",
  "instructions",
  "cancel",
  "raise",
  "send",
  "scxml",
  "initial",
  "history",
  "donedata",
  "content",
  "param",
  "invoke",
  "finalize",
];

// Define common attributes for elements
const COMMON_ATTRIBUTES = ["id", "name", "expr"];

// Define element-specific attributes
const ELEMENT_ATTRIBUTES: Record<string, string[]> = {
  workflow: ["id", "name", "initial", "version"],
  state: ["id", "name", "initial"],
  llm: [
    "model",
    "temperature",
    "maxTokens",
    "topP",
    "frequencyPenalty",
    "presencePenalty",
  ],
  data: ["id", "expr", "src"],
  assign: ["location", "expr"],
  transition: ["event", "target", "cond", "type"],
  if: ["cond"],
  foreach: ["array", "item", "index"],
  script: ["src"],
  log: ["expr", "label"],
};

/**
 * Get all available AIML element tag names
 */
export function getElementTagNames(): string[] {
  return AIML_ELEMENTS;
}

/**
 * Get attributes for a specific element tag
 * @param tagName The element tag name
 */
export function getElementAttributes(tagName: string): string[] {
  // Return element-specific attributes plus common attributes
  const specificAttrs = ELEMENT_ATTRIBUTES[tagName] || [];
  return [...specificAttrs, ...COMMON_ATTRIBUTES];
}

/**
 * Determine if the cursor is inside an element tag
 * @param document The text document
 * @param position The cursor position
 */
export function isInsideElementTag(
  document: TextDocument,
  position: Position
): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find the last '<' before the cursor
  let lastOpenBracket = text.lastIndexOf("<", offset);
  if (lastOpenBracket === -1) {
    return false;
  }

  // Find the next '>' after the last '<'
  const nextCloseBracket = text.indexOf(">", lastOpenBracket);

  // If there's no '>' or it's after the cursor, we're inside a tag
  return nextCloseBracket === -1 || nextCloseBracket >= offset;
}

/**
 * Extract the current element tag name at cursor position
 * @param document The text document
 * @param position The cursor position
 */
export function getCurrentElementTagName(
  document: TextDocument,
  position: Position
): string | null {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find the last '<' before the cursor
  let lastOpenBracket = text.lastIndexOf("<", offset);
  if (lastOpenBracket === -1) {
    return null;
  }

  // Extract the text between '<' and the cursor or the first whitespace
  const tagText = text.substring(lastOpenBracket + 1, offset);
  const match = tagText.match(/^(\w+)/);

  return match ? match[1] : null;
}

/**
 * Check if cursor is at a position where attribute names should be suggested
 * @param document The text document
 * @param position The cursor position
 */
export function isAtAttributePosition(
  document: TextDocument,
  position: Position
): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find the last '<' before the cursor
  let lastOpenBracket = text.lastIndexOf("<", offset);
  if (lastOpenBracket === -1) {
    return false;
  }

  // Find the next '>' after the last '<'
  const nextCloseBracket = text.indexOf(">", lastOpenBracket);

  // If there's no '>' or it's after the cursor, and we have a tag name followed by whitespace
  if (nextCloseBracket === -1 || nextCloseBracket >= offset) {
    const tagText = text.substring(lastOpenBracket + 1, offset);
    return /^\w+\s+/.test(tagText);
  }

  return false;
}

/**
 * Provide completion items based on document context
 * @param document The text document
 * @param position The cursor position
 */
export function provideCompletionItems(
  document: TextDocument,
  position: Position
): CompletionItem[] {
  // For debugging, always return element tag completions
  // This will help us verify if the completion provider is being called
  return getElementTagNames().map((tag) => ({
    label: tag,
    kind: CompletionItemKind.Class,
    detail: `AIML Element`,
    documentation: `The ${tag} element`,
  }));
}
