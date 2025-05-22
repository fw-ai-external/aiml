import {
  SemanticTokensBuilder,
  type SemanticTokens,
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

interface ScriptTagInfo {
  startLine: number;
  endLine: number;
  language: string;
  content: string;
  startChar: number;
  endChar: number;
}

/**
 * Extract semantic tokens from AIML document
 * Enhanced to handle embedded languages in script tags
 */
export async function extractSemanticTokens(
  document: TextDocument
): Promise<SemanticTokens> {
  const builder = new SemanticTokensBuilder();

  try {
    const text = document.getText();

    // First, extract and highlight script tags with embedded languages
    const scriptTags = extractScriptTags(text, document);

    // Add defensive checks
    if (scriptTags && Array.isArray(scriptTags)) {
      highlightScriptTags(scriptTags, builder);
    }

    // Then highlight the rest of the AIML content with defensive check
    if (text) {
      extractTokensFromText(text, document, builder, scriptTags || []);
    }
  } catch (error) {
    // More detailed error logging
    console.error(`Semantic highlighting error for ${document.uri}:`, error);
    // Don't propagate the error - return empty tokens instead
    return { data: [] };
  }

  // Safely build tokens even if there was an issue
  try {
    return builder.build();
  } catch (error) {
    console.error("Failed to build semantic tokens:", error);
    return { data: [] };
  }
}

/**
 * Extract script tags and their embedded content
 */
function extractScriptTags(
  text: string,
  document: TextDocument
): ScriptTagInfo[] {
  const scriptTags: ScriptTagInfo[] = [];

  // Enhanced regex to capture script tags with optional lang/language attributes
  const scriptRegex =
    /<script(?:[^>]*\s(?:lang|language)\s*=\s*["']([^"']*)["'][^>]*)?>([^]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(text)) !== null) {
    const language = match[1] || "javascript"; // Default to JavaScript
    const content = match[2];

    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);

    // Find the actual content start (after the opening tag)
    const openTagEnd = match.index + match[0].indexOf(">") + 1;
    const contentStart = match.index + match[0].indexOf(content);

    const contentStartPos = document.positionAt(contentStart);
    const contentEndPos = document.positionAt(contentStart + content.length);

    scriptTags.push({
      startLine: startPos.line,
      endLine: endPos.line,
      language: normalizeLanguage(language),
      content: content.trim(),
      startChar: contentStartPos.character,
      endChar: contentEndPos.character,
    });
  }

  return scriptTags;
}

/**
 * Normalize language identifiers
 */
function normalizeLanguage(lang: string): string {
  const normalizedLang = lang.toLowerCase().trim();

  switch (normalizedLang) {
    case "js":
    case "javascript":
    case "ecmascript":
      return "javascript";
    case "py":
    case "python":
      return "python";
    case "ts":
    case "typescript":
      return "typescript";
    default:
      return "javascript"; // Default fallback
  }
}

/**
 * Highlight script tag content with language-specific tokenization
 */
function highlightScriptTags(
  scriptTags: ScriptTagInfo[],
  builder: SemanticTokensBuilder
): void {
  for (const scriptTag of scriptTags) {
    const lines = scriptTag.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineIndex = scriptTag.startLine + i + 1; // +1 to account for opening tag line

      if (
        scriptTag.language === "javascript" ||
        scriptTag.language === "typescript"
      ) {
        highlightJavaScriptLine(line, lineIndex, builder);
      } else if (scriptTag.language === "python") {
        highlightPythonLine(line, lineIndex, builder);
      } else {
        // Generic highlighting for unknown languages
        highlightGenericCodeLine(line, lineIndex, builder);
      }
    }
  }
}

/**
 * Highlight JavaScript/TypeScript code
 */
function highlightJavaScriptLine(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  // JavaScript keywords
  const jsKeywords = [
    "const",
    "let",
    "var",
    "function",
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "default",
    "try",
    "catch",
    "finally",
    "throw",
    "return",
    "break",
    "continue",
    "new",
    "typeof",
    "instanceof",
    "this",
    "super",
    "class",
    "extends",
    "import",
    "export",
    "from",
    "as",
    "async",
    "await",
    "yield",
  ];

  // Built-in objects and functions
  const jsBuiltins = [
    "console",
    "JSON",
    "Math",
    "Date",
    "Object",
    "Array",
    "String",
    "Number",
    "Boolean",
    "RegExp",
    "Promise",
    "Error",
    "parseInt",
    "parseFloat",
    "isNaN",
    "isFinite",
    "eval",
    "ctx",
  ];

  highlightKeywords(
    line,
    lineIndex,
    jsKeywords,
    SemanticTokenTypes.KEYWORD,
    builder
  );
  highlightKeywords(
    line,
    lineIndex,
    jsBuiltins,
    SemanticTokenTypes.FUNCTION,
    builder
  );
  highlightStrings(line, lineIndex, builder);
  highlightNumbers(line, lineIndex, builder);
  highlightComments(line, lineIndex, builder);
  highlightOperators(line, lineIndex, builder);
}

/**
 * Highlight Python code
 */
function highlightPythonLine(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  // Python keywords
  const pythonKeywords = [
    "def",
    "class",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "try",
    "except",
    "finally",
    "with",
    "as",
    "import",
    "from",
    "return",
    "yield",
    "break",
    "continue",
    "pass",
    "raise",
    "assert",
    "del",
    "global",
    "nonlocal",
    "lambda",
    "and",
    "or",
    "not",
    "in",
    "is",
    "True",
    "False",
    "None",
  ];

  // Python built-ins
  const pythonBuiltins = [
    "print",
    "len",
    "range",
    "enumerate",
    "zip",
    "map",
    "filter",
    "sum",
    "max",
    "min",
    "sorted",
    "list",
    "dict",
    "tuple",
    "set",
    "str",
    "int",
    "float",
    "bool",
    "type",
    "isinstance",
    "hasattr",
  ];

  highlightKeywords(
    line,
    lineIndex,
    pythonKeywords,
    SemanticTokenTypes.KEYWORD,
    builder
  );
  highlightKeywords(
    line,
    lineIndex,
    pythonBuiltins,
    SemanticTokenTypes.FUNCTION,
    builder
  );
  highlightStrings(line, lineIndex, builder);
  highlightNumbers(line, lineIndex, builder);
  highlightPythonComments(line, lineIndex, builder);
  highlightOperators(line, lineIndex, builder);
}

/**
 * Generic code highlighting for unknown languages
 */
function highlightGenericCodeLine(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  highlightStrings(line, lineIndex, builder);
  highlightNumbers(line, lineIndex, builder);
  highlightComments(line, lineIndex, builder);
}

/**
 * Highlight keywords in a line
 */
function highlightKeywords(
  line: string,
  lineIndex: number,
  keywords: string[],
  tokenType: SemanticTokenTypes,
  builder: SemanticTokensBuilder
): void {
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      builder.push(
        lineIndex,
        match.index,
        keyword.length,
        tokenType,
        1 << SemanticTokenModifiers.DECLARATION
      );
    }
  }
}

/**
 * Highlight string literals
 */
function highlightStrings(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  // Single and double quoted strings
  const stringRegex = /(['"])(?:(?!\1)[^\\]|\\.)*/g;
  let match: RegExpExecArray | null;

  while ((match = stringRegex.exec(line)) !== null) {
    builder.push(
      lineIndex,
      match.index,
      match[0].length,
      SemanticTokenTypes.STRING,
      0
    );
  }

  // Template literals (backticks)
  const templateRegex = /`[^`]*`/g;
  while ((match = templateRegex.exec(line)) !== null) {
    builder.push(
      lineIndex,
      match.index,
      match[0].length,
      SemanticTokenTypes.STRING,
      0
    );
  }
}

/**
 * Highlight numeric literals
 */
function highlightNumbers(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  const numberRegex = /\b\d+(\.\d+)?\b/g;
  let match: RegExpExecArray | null;

  while ((match = numberRegex.exec(line)) !== null) {
    builder.push(
      lineIndex,
      match.index,
      match[0].length,
      SemanticTokenTypes.NUMBER,
      0
    );
  }
}

/**
 * Highlight JavaScript-style comments
 */
function highlightComments(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  // Single-line comments
  const commentMatch = line.match(/\/\/.*/);
  if (commentMatch) {
    const startIndex = line.indexOf(commentMatch[0]);
    builder.push(
      lineIndex,
      startIndex,
      commentMatch[0].length,
      SemanticTokenTypes.COMMENT,
      1 << SemanticTokenModifiers.DOCUMENTATION
    );
  }

  // Multi-line comment start/end (basic handling)
  const multiCommentRegex = /\/\*.*?\*\//g;
  let match: RegExpExecArray | null;

  while ((match = multiCommentRegex.exec(line)) !== null) {
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
 * Highlight Python-style comments
 */
function highlightPythonComments(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  const commentMatch = line.match(/#.*/);
  if (commentMatch) {
    const startIndex = line.indexOf(commentMatch[0]);
    builder.push(
      lineIndex,
      startIndex,
      commentMatch[0].length,
      SemanticTokenTypes.COMMENT,
      1 << SemanticTokenModifiers.DOCUMENTATION
    );
  }
}

/**
 * Highlight operators
 */
function highlightOperators(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder
): void {
  const operatorRegex = /[+\-*/%=<>!&|^~?:]/g;
  let match: RegExpExecArray | null;

  while ((match = operatorRegex.exec(line)) !== null) {
    builder.push(lineIndex, match.index, 1, SemanticTokenTypes.OPERATOR, 0);
  }
}

/**
 * Extract semantic tokens using text-based parsing for AIML content
 * Skips script tag content areas to avoid double-highlighting
 */
function extractTokensFromText(
  text: string,
  document: TextDocument,
  builder: SemanticTokensBuilder,
  scriptTags: ScriptTagInfo[]
): void {
  try {
    const lines = text.split("\n");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip lines that are inside script tags (already highlighted)
      if (isLineInScriptTag(lineIndex, scriptTags)) {
        continue;
      }

      try {
        // Highlight AIML elements
        highlightElements(line, lineIndex, builder);

        // Highlight attributes
        highlightAttributes(line, lineIndex, builder);

        // Highlight expressions
        highlightExpressions(line, lineIndex, builder);

        // Highlight AIML comments
        highlightAIMLComments(line, lineIndex, builder);
      } catch (lineError) {
        // Log error but continue processing other lines
        console.error(`Error highlighting line ${lineIndex}: ${lineError}`);
      }
    }
  } catch (error) {
    // Log error but don't crash the server
    console.error(`Error extracting tokens from text: ${error}`);
  }
}

/**
 * Check if a line is inside a script tag
 */
function isLineInScriptTag(
  lineIndex: number,
  scriptTags: ScriptTagInfo[]
): boolean {
  return scriptTags.some(
    (tag) => lineIndex >= tag.startLine && lineIndex <= tag.endLine
  );
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
 * Highlight AIML comments
 */
function highlightAIMLComments(
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
