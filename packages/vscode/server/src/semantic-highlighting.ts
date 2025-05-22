import {
  SemanticTokensBuilder,
  type SemanticTokens,
  type Range,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";

// Define semantic token types (these map to VSCode's built-in types)
export enum SemanticTokenTypes {
  NAMESPACE = 0, // For workflow elements
  CLASS = 1, // For state elements
  ENUM = 2, // For element names
  INTERFACE = 3, // For data elements
  STRUCT = 4, // For transition elements
  TYPE_PARAMETER = 5, // For script elements
  PARAMETER = 6, // For attribute names
  VARIABLE = 7, // For attribute values
  PROPERTY = 8, // For expressions
  ENUM_MEMBER = 9, // For special values
  EVENT = 10, // For event handlers
  FUNCTION = 11, // For LLM calls
  METHOD = 12, // For tool calls
  MACRO = 13, // For conditional elements
  KEYWORD = 14, // For AIML keywords
  MODIFIER = 15, // For modifiers
  COMMENT = 16, // For comments
  STRING = 17, // For string values
  NUMBER = 18, // For numeric values
  REGEXP = 19, // For regex patterns
  OPERATOR = 20, // For operators
}

// Define semantic token modifiers
export enum SemanticTokenModifiers {
  DECLARATION = 0,
  DEFINITION = 1,
  READONLY = 2,
  STATIC = 3,
  DEPRECATED = 4,
  ABSTRACT = 5,
  ASYNC = 6,
  MODIFICATION = 7,
  DOCUMENTATION = 8,
  DEFAULT_LIBRARY = 9,
}

// Legend that maps our types to VSCode's token types
export const SEMANTIC_TOKEN_LEGEND = {
  tokenTypes: [
    "namespace", // 0
    "class", // 1
    "enum", // 2
    "interface", // 3
    "struct", // 4
    "typeParameter", // 5
    "parameter", // 6
    "variable", // 7
    "property", // 8
    "enumMember", // 9
    "event", // 10
    "function", // 11
    "method", // 12
    "macro", // 13
    "keyword", // 14
    "modifier", // 15
    "comment", // 16
    "string", // 17
    "number", // 18
    "regexp", // 19
    "operator", // 20
  ],
  tokenModifiers: [
    "declaration", // 0
    "definition", // 1
    "readonly", // 2
    "static", // 3
    "deprecated", // 4
    "abstract", // 5
    "async", // 6
    "modification", // 7
    "documentation", // 8
    "defaultLibrary", // 9
  ],
};

interface SemanticToken {
  line: number;
  character: number;
  length: number;
  tokenType: SemanticTokenTypes;
  tokenModifiers: number;
}

/**
 * Extract semantic tokens from AIML document
 * Currently falls back to text-based parsing since the parser doesn't expose AST
 */
export async function extractSemanticTokens(
  document: TextDocument
): Promise<SemanticTokens> {
  const builder = new SemanticTokensBuilder();

  try {
    // Note: @aiml/parser currently doesn't expose AST, only diagnostics
    // For now, we'll use text-based parsing for semantic highlighting
    // TODO: Update when parser exposes AST or create a separate AST parser

    const text = document.getText();
    extractTokensFromText(text, document, builder);
  } catch (error) {
    // If parsing fails, return empty tokens
    console.error("Failed to parse document for semantic highlighting:", error);
  }

  return builder.build();
}

/**
 * Extract semantic tokens using text-based parsing
 * This is a temporary solution until AST is available from @aiml/parser
 */
function extractTokensFromText(
  text: string,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  const lines = text.split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // Highlight AIML elements
    highlightElements(line, lineIndex, builder);

    // Highlight attributes
    highlightAttributes(line, lineIndex, builder);

    // Highlight expressions
    highlightExpressions(line, lineIndex, builder);

    // Highlight comments
    highlightComments(line, lineIndex, builder);
  }
}

/**
 * Highlight AIML element tags
 */
function highlightElements(
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
function highlightAttributes(
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
function highlightExpressions(
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
 * Highlight comments
 */
function highlightComments(
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

/**
 * Get token type for attribute values based on text analysis
 */
function getAttributeValueTokenTypeFromText(
  attrName: string,
  attrValue: string
): SemanticTokenTypes {
  // Check if it's an expression
  if (attrValue.includes("({") || attrValue.includes("=>")) {
    return SemanticTokenTypes.PROPERTY;
  }

  // Check for specific attribute types
  if (attrName === "model") {
    return SemanticTokenTypes.ENUM_MEMBER;
  }

  if (attrName === "language" || attrName === "lang") {
    return SemanticTokenTypes.ENUM_MEMBER;
  }

  if (attrName === "id" || attrName === "name") {
    return SemanticTokenTypes.VARIABLE;
  }

  // Check if it's a number
  if (/^\d+(\.\d+)?$/.test(attrValue)) {
    return SemanticTokenTypes.NUMBER;
  }

  // Default to string
  return SemanticTokenTypes.STRING;
}

/**
 * Get modifiers for element name
 */
function getElementModifiersForName(elementName: string): number {
  let modifiers = 0;

  // Mark as declaration
  modifiers |= 1 << SemanticTokenModifiers.DECLARATION;

  // Mark final elements as readonly
  if (elementName === "final" || elementName === "data") {
    modifiers |= 1 << SemanticTokenModifiers.READONLY;
  }

  // Mark async elements
  if (
    elementName === "llm" ||
    elementName === "toolcall" ||
    elementName === "script"
  ) {
    modifiers |= 1 << SemanticTokenModifiers.ASYNC;
  }

  return modifiers;
}

/**
 * Walk the AST and extract semantic tokens
 */
function walkASTForTokens(
  node: any,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  if (!node || typeof node !== "object") {
    return;
  }

  // Handle different AST node types
  switch (node.type) {
    case "Document":
      // Handle frontmatter
      if (node.frontmatter) {
        handleFrontmatter(node.frontmatter, document, builder);
      }
      // Process children
      if (node.children) {
        node.children.forEach((child: any) => {
          walkASTForTokens(child, document, builder);
        });
      }
      break;

    case "Element":
      handleElement(node, document, builder);
      break;

    case "Text":
      handleTextContent(node, document, builder);
      break;

    case "Expression":
      handleExpression(node, document, builder);
      break;

    case "Comment":
      handleComment(node, document, builder);
      break;

    default:
      // Recursively process children for unknown node types
      if (node.children) {
        node.children.forEach((child: any) => {
          walkASTForTokens(child, document, builder);
        });
      }
      break;
  }
}

/**
 * Handle AIML elements
 */
function handleElement(
  node: any,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  if (!node.position || !node.tagName) {
    return;
  }

  const elementName = node.tagName;
  const tokenType = getElementTokenType(elementName);
  const tokenModifiers = getElementModifiers(elementName, node);

  // Highlight opening tag name
  if (node.position.start) {
    const range = getRangeFromPosition(node.position.start, elementName.length);
    addToken(builder, range, tokenType, tokenModifiers);
  }

  // Highlight attributes
  if (node.attributes) {
    Object.entries(node.attributes).forEach(
      ([attrName, attrValue]: [string, any]) => {
        handleAttribute(attrName, attrValue, node, document, builder);
      }
    );
  }

  // Highlight closing tag if present
  if (node.position.end && !node.selfClosing) {
    // The closing tag would be at the end position
    const closingTagRange = getRangeFromPosition(
      node.position.end,
      elementName.length
    );
    addToken(builder, closingTagRange, tokenType, tokenModifiers);
  }

  // Process children
  if (node.children) {
    node.children.forEach((child: any) => {
      walkASTForTokens(child, document, builder);
    });
  }
}

/**
 * Handle element attributes
 */
function handleAttribute(
  attrName: string,
  attrValue: any,
  element: any,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  // Highlight attribute name
  if (attrValue.position?.name) {
    const nameRange = getRangeFromPosition(
      attrValue.position.name,
      attrName.length
    );
    addToken(
      builder,
      nameRange,
      SemanticTokenTypes.PARAMETER,
      SemanticTokenModifiers.DECLARATION
    );
  }

  // Highlight attribute value based on type
  if (attrValue.position?.value) {
    const valueTokenType = getAttributeValueTokenType(
      attrName,
      attrValue,
      element
    );
    const valueRange = getRangeFromPosition(
      attrValue.position.value,
      attrValue.raw?.length || String(attrValue.value).length
    );
    addToken(builder, valueRange, valueTokenType, 0);
  }

  // If the attribute value contains an expression, handle it
  if (attrValue.type === "Expression") {
    handleExpression(attrValue, document, builder);
  }
}

/**
 * Handle AIML expressions
 */
function handleExpression(
  node: any,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  if (!node.position) {
    return;
  }

  // Highlight the entire expression as a property
  const expressionRange = getRangeFromPosition(
    node.position.start,
    node.position.end.offset - node.position.start.offset
  );

  addToken(
    builder,
    expressionRange,
    SemanticTokenTypes.PROPERTY,
    SemanticTokenModifiers.DECLARATION
  );

  // TODO: Parse JavaScript/TypeScript expressions for more granular highlighting
  // This would require a separate JavaScript/TypeScript parser
}

/**
 * Handle comments
 */
function handleComment(
  node: any,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  if (!node.position) {
    return;
  }

  const commentRange = getRangeFromPosition(
    node.position.start,
    node.position.end.offset - node.position.start.offset
  );

  addToken(
    builder,
    commentRange,
    SemanticTokenTypes.COMMENT,
    SemanticTokenModifiers.DOCUMENTATION
  );
}

/**
 * Handle frontmatter (YAML)
 */
function handleFrontmatter(
  frontmatter: any,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  // Basic YAML highlighting for frontmatter
  if (frontmatter.position) {
    const frontmatterRange = getRangeFromPosition(
      frontmatter.position.start,
      frontmatter.position.end.offset - frontmatter.position.start.offset
    );

    addToken(
      builder,
      frontmatterRange,
      SemanticTokenTypes.STRUCT,
      SemanticTokenModifiers.DECLARATION
    );
  }
}

/**
 * Handle text content (system prompts, etc.)
 */
function handleTextContent(
  node: any,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  // Text content could be highlighted differently based on context
  // For now, we'll leave it as default text
  // Could add markdown highlighting here if needed
}

/**
 * Get appropriate token type for element
 */
function getElementTokenType(elementName: string): SemanticTokenTypes {
  const elementTypeMap: Record<string, SemanticTokenTypes> = {
    // Workflow elements
    workflow: SemanticTokenTypes.NAMESPACE,
    state: SemanticTokenTypes.CLASS,
    parallel: SemanticTokenTypes.CLASS,
    final: SemanticTokenTypes.CLASS,
    initial: SemanticTokenTypes.CLASS,
    history: SemanticTokenTypes.CLASS,

    // Data elements
    datamodel: SemanticTokenTypes.INTERFACE,
    data: SemanticTokenTypes.INTERFACE,
    assign: SemanticTokenTypes.VARIABLE,

    // Control flow
    if: SemanticTokenTypes.MACRO,
    elseif: SemanticTokenTypes.MACRO,
    else: SemanticTokenTypes.MACRO,
    foreach: SemanticTokenTypes.MACRO,

    // Actions
    script: SemanticTokenTypes.TYPE_PARAMETER,
    llm: SemanticTokenTypes.FUNCTION,
    toolcall: SemanticTokenTypes.METHOD,
    log: SemanticTokenTypes.METHOD,
    send: SemanticTokenTypes.METHOD,
    invoke: SemanticTokenTypes.METHOD,

    // Transitions and events
    transition: SemanticTokenTypes.STRUCT,
    onentry: SemanticTokenTypes.EVENT,
    onexit: SemanticTokenTypes.EVENT,
    onerror: SemanticTokenTypes.EVENT,
    onchunk: SemanticTokenTypes.EVENT,

    // Content elements
    prompt: SemanticTokenTypes.PROPERTY,
    instructions: SemanticTokenTypes.PROPERTY,
    content: SemanticTokenTypes.PROPERTY,
    param: SemanticTokenTypes.PARAMETER,
  };

  return elementTypeMap[elementName] || SemanticTokenTypes.ENUM;
}

/**
 * Get modifiers for element
 */
function getElementModifiers(elementName: string, node: any): number {
  let modifiers = 0;

  // Mark as declaration
  modifiers |= 1 << SemanticTokenModifiers.DECLARATION;

  // Mark final elements as readonly
  if (elementName === "final" || elementName === "data") {
    modifiers |= 1 << SemanticTokenModifiers.READONLY;
  }

  // Mark async elements
  if (
    elementName === "llm" ||
    elementName === "toolcall" ||
    elementName === "script"
  ) {
    modifiers |= 1 << SemanticTokenModifiers.ASYNC;
  }

  return modifiers;
}

/**
 * Get appropriate token type for attribute values
 */
function getAttributeValueTokenType(
  attrName: string,
  attrValue: any,
  element: any
): SemanticTokenTypes {
  // Check if it's an expression
  if (attrValue.type === "Expression") {
    return SemanticTokenTypes.PROPERTY;
  }

  // Check for specific attribute types
  if (attrName === "model" && element.tagName === "llm") {
    return SemanticTokenTypes.ENUM_MEMBER;
  }

  if (attrName === "language" || attrName === "lang") {
    return SemanticTokenTypes.ENUM_MEMBER;
  }

  if (attrName === "id" || attrName === "name") {
    return SemanticTokenTypes.VARIABLE;
  }

  // Check if it's a number
  if (typeof attrValue.value === "number") {
    return SemanticTokenTypes.NUMBER;
  }

  // Default to string
  return SemanticTokenTypes.STRING;
}

/**
 * Helper to create range from position
 */
function getRangeFromPosition(position: any, length: number): Range {
  return {
    start: {
      line: position.line - 1, // LSP uses 0-based lines
      character: position.column - 1, // LSP uses 0-based columns
    },
    end: {
      line: position.line - 1,
      character: position.column - 1 + length,
    },
  };
}

/**
 * Helper to add token to builder
 */
function addToken(
  builder: SemanticTokensBuilder,
  range: Range,
  tokenType: SemanticTokenTypes,
  tokenModifiers: number
): void {
  builder.push(
    range.start.line,
    range.start.character,
    range.end.character - range.start.character,
    tokenType,
    tokenModifiers
  );
}
