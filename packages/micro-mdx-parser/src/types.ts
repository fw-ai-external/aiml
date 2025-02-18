export interface Position {
  index: number;
  column: number;
  line: number;
}

export interface PositionRange {
  start: Position;
  end: Position;
}

export type TokenType =
  | "text"
  | "comment"
  | "tag-start"
  | "tag"
  | "tag-end"
  | "attribute"
  | "import";

export interface BaseToken {
  type: TokenType;
  position?: PositionRange;
  content?: string;
  close?: boolean;
  src?: string;
}

export interface TextToken extends BaseToken {
  type: "text";
  content: string;
}

export interface CommentToken extends BaseToken {
  type: "comment";
  content: string;
}

export interface TagToken extends BaseToken {
  type: "tag";
  content: string;
}

export interface AttributeToken extends BaseToken {
  type: "attribute";
  content: string;
  src: string;
}

export interface TagStartToken extends BaseToken {
  type: "tag-start";
  close: boolean;
}

export interface TagEndToken extends BaseToken {
  type: "tag-end";
  close: boolean;
  isSelfClosing?: boolean;
}

export interface ImportToken extends BaseToken {
  type: "import";
  source: string;
  specifiers: ImportSpecifier[];
}

export type Token =
  | TextToken
  | CommentToken
  | TagToken
  | AttributeToken
  | TagStartToken
  | TagEndToken
  | ImportToken;

export interface BaseNode {
  type: string;
  content?: string;
  position: PositionRange;
}

export interface ElementNode extends BaseNode {
  type: "element";
  tagName: string;
  props: Record<string, unknown>;
  propsRaw: string;
  children: (ElementNode | Token)[];
  isSelfClosing?: boolean;
  position: PositionRange;
}

export interface ImportNode extends BaseNode {
  type: "import";
  source: string;
  specifiers: ImportSpecifier[];
}

export interface ImportSpecifier {
  type: "default" | "named";
  local: string;
  imported?: string;
}

export interface FormattedNode extends BaseNode {
  type: "element" | "component" | "import" | string;
  tagName?: string;
  tagValue?: string;
  props?: Record<string, unknown>;
  propsRaw?: string;
  children?: FormattedNode[];
  isSelfClosing?: boolean;
  position: PositionRange;
}

export interface LexerOptions {
  childlessTags: string[];
  closingTags: string[];
  closingTagAncestorBreakers: Record<string, string[]>;
  includePositions: boolean;
  voidTags: string[];
}

export interface LexerState {
  str: string;
  options: LexerOptions;
  position: Position;
  tokens: Token[];
  _tagStart?: number;
}

export interface ParserState {
  tokens: Token[];
  options: {
    closingTags: string[];
    voidTags: string[];
    closingTagAncestorBreakers: Record<string, string[]>;
  };
  cursor: number;
  stack: StackNode[];
}

export interface StackNode {
  tagName: string | null;
  children: (Token | ElementNode | ImportNode)[];
  position: PositionRange;
}

export interface RootNode {
  tagName: null;
  children: (Token | ElementNode)[];
}

export interface CodeBlock {
  index: number;
  syntax?: string;
  block: string;
  code: string;
}
