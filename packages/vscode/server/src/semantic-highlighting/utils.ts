import { SemanticTokenTypes, SemanticTokenModifiers } from "./types";

/**
 * Get semantic token type for AIML elements
 */
export function getElementTokenType(elementName: string): SemanticTokenTypes {
  const lowerName = elementName.toLowerCase();

  // Workflow elements
  if (lowerName === "workflow") {
    return SemanticTokenTypes.NAMESPACE;
  }

  // State elements
  if (["state", "initial", "final"].includes(lowerName)) {
    return SemanticTokenTypes.CLASS;
  }

  // Data elements
  if (["data", "datamodel", "param", "content"].includes(lowerName)) {
    return SemanticTokenTypes.INTERFACE;
  }

  // Transition elements
  if (["transition", "send", "raise"].includes(lowerName)) {
    return SemanticTokenTypes.STRUCT;
  }

  // Script elements
  if (["script", "assign", "log"].includes(lowerName)) {
    return SemanticTokenTypes.TYPE_PARAMETER;
  }

  // AI/LLM elements
  if (["llm", "chat", "completion", "embedding"].includes(lowerName)) {
    return SemanticTokenTypes.FUNCTION;
  }

  // Tool elements
  if (["tool", "invoke", "call"].includes(lowerName)) {
    return SemanticTokenTypes.METHOD;
  }

  // Conditional elements
  if (["if", "elseif", "else", "foreach", "while"].includes(lowerName)) {
    return SemanticTokenTypes.MACRO;
  }

  // Event elements
  if (["onevent", "event"].includes(lowerName)) {
    return SemanticTokenTypes.EVENT;
  }

  // Default to ENUM for other elements
  return SemanticTokenTypes.ENUM;
}

/**
 * Get semantic token modifiers for element names
 */
export function getElementModifiersForName(elementName: string): number {
  const lowerName = elementName.toLowerCase();

  let modifiers = 1 << SemanticTokenModifiers.DECLARATION;

  // Mark deprecated elements
  if (["deprecated", "obsolete"].includes(lowerName)) {
    modifiers |= 1 << SemanticTokenModifiers.DEPRECATED;
  }

  // Mark async elements
  if (["async", "await", "promise"].includes(lowerName)) {
    modifiers |= 1 << SemanticTokenModifiers.ASYNC;
  }

  // Mark readonly elements
  if (["readonly", "const", "final"].includes(lowerName)) {
    modifiers |= 1 << SemanticTokenModifiers.READONLY;
  }

  return modifiers;
}

/**
 * Get token type for attribute values based on AST content type
 */
export function getAttributeValueTokenType(
  attrName: string,
  attrValue: any,
  contentType?: string
): SemanticTokenTypes {
  if (contentType) {
    switch (contentType) {
      case "expression":
      case "function":
        return SemanticTokenTypes.PROPERTY;
      case "number":
        return SemanticTokenTypes.NUMBER;
      case "boolean":
        return SemanticTokenTypes.ENUM_MEMBER;
      case "array":
      case "object":
        return SemanticTokenTypes.PROPERTY;
      default:
        break;
    }
  }

  // Check for specific attribute types
  if (attrName === "model") {
    return SemanticTokenTypes.ENUM_MEMBER;
  }

  if (attrName === "type" || attrName === "language" || attrName === "lang") {
    return SemanticTokenTypes.ENUM_MEMBER;
  }

  if (attrName === "id" || attrName === "name") {
    return SemanticTokenTypes.VARIABLE;
  }

  // Default to string
  return SemanticTokenTypes.STRING;
}

/**
 * Get token type for attribute values based on text analysis (fallback)
 */
export function getAttributeValueTokenTypeFromText(
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

  // Check if it's a boolean
  if (["true", "false"].includes(attrValue.toLowerCase())) {
    return SemanticTokenTypes.ENUM_MEMBER;
  }

  // Default to string
  return SemanticTokenTypes.STRING;
}

/**
 * Normalize language identifiers
 */
export function normalizeLanguage(lang: string): string {
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
 * Check if a line is inside a script tag
 */
export function isLineInScriptTag(
  lineIndex: number,
  scriptTags: { startLine: number; endLine: number }[]
): boolean {
  return scriptTags.some(
    (tag) => lineIndex >= tag.startLine && lineIndex <= tag.endLine
  );
}
