import { SemanticTokensBuilder } from "vscode-languageserver/node";
import { SemanticTokenTypes, SemanticTokenModifiers } from "./types";
import type { ScriptTagInfo } from "./types";

/**
 * Highlight script tag content with language-specific tokenization
 */
export function highlightScriptTags(
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
export function highlightJavaScriptLine(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder,
  baseOffset: number = 0
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
    "null",
    "undefined",
    "true",
    "false",
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
    "window",
    "document",
    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",
  ];

  highlightKeywords(
    line,
    lineIndex,
    jsKeywords,
    SemanticTokenTypes.KEYWORD,
    builder,
    baseOffset
  );
  highlightKeywords(
    line,
    lineIndex,
    jsBuiltins,
    SemanticTokenTypes.FUNCTION,
    builder,
    baseOffset
  );
  highlightStrings(line, lineIndex, builder, baseOffset);
  highlightNumbers(line, lineIndex, builder, baseOffset);
  highlightComments(line, lineIndex, builder, baseOffset);
  highlightOperators(line, lineIndex, builder, baseOffset);
}

/**
 * Highlight Python code
 */
export function highlightPythonLine(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder,
  baseOffset: number = 0
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
    "getattr",
    "setattr",
    "delattr",
    "dir",
    "vars",
    "open",
    "input",
  ];

  highlightKeywords(
    line,
    lineIndex,
    pythonKeywords,
    SemanticTokenTypes.KEYWORD,
    builder,
    baseOffset
  );
  highlightKeywords(
    line,
    lineIndex,
    pythonBuiltins,
    SemanticTokenTypes.FUNCTION,
    builder,
    baseOffset
  );
  highlightStrings(line, lineIndex, builder, baseOffset);
  highlightNumbers(line, lineIndex, builder, baseOffset);
  highlightPythonComments(line, lineIndex, builder, baseOffset);
  highlightOperators(line, lineIndex, builder, baseOffset);
}

/**
 * Generic code highlighting for unknown languages
 */
export function highlightGenericCodeLine(
  line: string,
  lineIndex: number,
  builder: SemanticTokensBuilder,
  baseOffset: number = 0
): void {
  highlightStrings(line, lineIndex, builder, baseOffset);
  highlightNumbers(line, lineIndex, builder, baseOffset);
  highlightComments(line, lineIndex, builder, baseOffset);
}

/**
 * Highlight keywords in a line
 */
function highlightKeywords(
  line: string,
  lineIndex: number,
  keywords: string[],
  tokenType: SemanticTokenTypes,
  builder: SemanticTokensBuilder,
  baseOffset: number = 0
): void {
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      builder.push(
        lineIndex,
        baseOffset + match.index,
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
  builder: SemanticTokensBuilder,
  baseOffset: number = 0
): void {
  // Single and double quoted strings
  const stringRegex = /(['"])(?:(?!\1)[^\\]|\\.)*/g;
  let match: RegExpExecArray | null;

  while ((match = stringRegex.exec(line)) !== null) {
    builder.push(
      lineIndex,
      baseOffset + match.index,
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
      baseOffset + match.index,
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
  builder: SemanticTokensBuilder,
  baseOffset: number = 0
): void {
  const numberRegex = /\b\d+(\.\d+)?\b/g;
  let match: RegExpExecArray | null;

  while ((match = numberRegex.exec(line)) !== null) {
    builder.push(
      lineIndex,
      baseOffset + match.index,
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
  builder: SemanticTokensBuilder,
  baseOffset: number = 0
): void {
  // Single-line comments
  const commentMatch = line.match(/\/\/.*/);
  if (commentMatch) {
    const startIndex = line.indexOf(commentMatch[0]);
    builder.push(
      lineIndex,
      baseOffset + startIndex,
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
      baseOffset + match.index,
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
  builder: SemanticTokensBuilder,
  baseOffset: number = 0
): void {
  const commentMatch = line.match(/#.*/);
  if (commentMatch) {
    const startIndex = line.indexOf(commentMatch[0]);
    builder.push(
      lineIndex,
      baseOffset + startIndex,
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
  builder: SemanticTokensBuilder,
  baseOffset: number = 0
): void {
  const operatorRegex = /[+\-*/%=<>!&|^~?:]/g;
  let match: RegExpExecArray | null;

  while ((match = operatorRegex.exec(line)) !== null) {
    builder.push(
      lineIndex,
      baseOffset + match.index,
      1,
      SemanticTokenTypes.OPERATOR,
      0
    );
  }
}
