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

// AST Node type from parser
export interface AIMLASTNode {
  type: string;
  content?: string | number | boolean | null | object | any[];
  contentType?: string;
  children?: AIMLASTNode[];
  name?: string;
  attributes?: AIMLASTNode[];
  lineStart: number;
  columnStart: number;
  lineEnd: number;
  columnEnd: number;
}

export interface ScriptTagInfo {
  startLine: number;
  endLine: number;
  language: string;
  content: string;
  startChar: number;
  endChar: number;
}
