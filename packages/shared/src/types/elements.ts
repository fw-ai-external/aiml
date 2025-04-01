import type { z } from "zod";
/**
 * This file contains all element type definitions for the AIML system.
 * It serves as the single source of truth for element types, roles, and relationships.
 */

/**
 * All possible AIML element types.
 */
export const aimlElements = [
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
  // SCXML specific node types
  "scxml",
  "initial",
  "history",
  "donedata",
  "content",
  "param",
  "invoke",
  "finalize",
  "llm",
] as const;

/**
 * Type representing all valid element types
 */
export type ElementType = (typeof aimlElements)[number];

/**
 * Element roles define the general category of an element
 */
export type ElementRole =
  | "state"
  | "action"
  | "data-model"
  | "error"
  | "user-input"
  | "output";

/**
 * Defines what types of children an element can have
 */
export type AllowedChildrenType = string[] | "none" | "any" | "text";

/**
 * Maps element types to their roles
 */
export const elementRoleMap: Record<ElementType, ElementRole> = {
  workflow: "state",
  state: "state",
  parallel: "state",
  final: "state",
  datamodel: "state",
  data: "state",
  assign: "action",
  onentry: "action",
  onexit: "action",
  transition: "action",
  if: "action",
  elseif: "action",
  else: "action",
  foreach: "action",
  script: "action",
  llm: "output",
  toolcall: "action",
  log: "action",
  sendText: "output",
  sendToolCalls: "output",
  sendObject: "output",
  onerror: "error",
  onchunk: "action",
  prompt: "user-input",
  instructions: "user-input",
  cancel: "action",
  raise: "action",
  send: "action",
  scxml: "state",
  initial: "state",
  history: "state",
  donedata: "state",
  content: "state",
  param: "state",
  invoke: "action",
  finalize: "state",
};

/**
 * Base attributes that all elements can have
 */
export interface Attributes {
  [key: string]: string | number | undefined | boolean;
}

/**
 * Node types for the AIML AST
 */
export type ASTNodeType =
  | "paragraph"
  | "text"
  | "comment"
  | "element"
  | "import"
  | "header"
  | "expression"
  | "headerField"
  | "field";

/**
 * Base interface for all AIML nodes in the AST
 * Renamed from AIMLNode to SerializedBaseElement for better semantic clarity
 */
export interface SerializedBaseElement {
  type: ASTNodeType;
  id?: string;
  key: string;
  tag?: string;
  role?: ElementRole;
  elementType?: ElementType;
  attributes?: Attributes;
  children?: SerializedBaseElement[];
  parentId?: string;
  scope: string[];
  value?: string | number | boolean;
  filePath?: string;
  namedImports?: string[];
  defaultImport?: string;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
  comments?: CommentNode[];
}

/**
 * Import node in the AIML AST
 */
export interface ImportNode extends SerializedBaseElement {
  kind: "import";
  filePath: string;
  namedImports?: string[];
  defaultImport?: string;
}

/**
 * Header node in the AIML AST
 */
export interface HeaderNode extends SerializedBaseElement {
  kind: "header";
  children: HeaderFieldNode[];
}

/**
 * Header field node in the AIML AST
 */
export interface HeaderFieldNode extends SerializedBaseElement {
  kind: "headerField";
  id: string;
  value: string;
}

/**
 * Comment node in the AIML AST
 */
export interface CommentNode extends SerializedBaseElement {
  kind: "comment";
  value: string;
}

/**
 * Text node in the AIML AST
 */
export interface TextNode extends SerializedBaseElement {
  kind: "text";
  value: string | number | boolean;
}

/**
 * Expression node in the AIML AST
 */
export interface ExpressionNode extends SerializedBaseElement {
  kind: "expression";
  value: string;
}

/**
 * Paragraph node in the AIML AST
 */
export interface ParagraphNode extends SerializedBaseElement {
  kind: "paragraph";
  children: (TextNode | ExpressionNode)[];
}

/**
 * Base interface for all AIML elements
 * Renamed from IBaseElement to SerializedElement for consistency
 */
export interface SerializedElement extends SerializedBaseElement {
  type: "element";
  readonly id: string;
  readonly key: string;
  readonly tag: string;
  readonly role: ElementRole;
  readonly elementType: ElementType;
  readonly attributes: Attributes;
  readonly children: SerializedBaseElement[];
  readonly allowedChildren: AllowedChildrenType;
  readonly comments?: CommentNode[];
}

/**
 * More flexible node type for FireAgent
 */
export interface FireAgentNode extends Partial<SerializedBaseElement> {
  name?: string;
  tag?: string;
  nodes?: FireAgentNode[];
  kind?: string;
  scxmlType?: ElementType;
  [key: string]: any; // Allow additional properties
}

/**
 * Element props type
 */
export type ElementProps = Record<string, any>;

/**
 * Element configuration type
 */
export type ElementConfig<T> = z.ZodObject<any>;

/**
 * Base definition for an element
 */
export interface BaseElementDefinition {
  /**
   * The actual tag name used in the config/tsx
   */
  tag: ElementType;
  /**
   * The type of the element, should match the tag name
   */
  elementType: ElementType;
  /**
   * The role of the element
   */
  role: ElementRole;
  /**
   * The allowed children for this element as an array of tags or a function that returns an array of tags
   */
  allowedChildren?: AllowedChildrenType;
  /**
   * The props/options exposed to the schema by this element
   */
  propsSchema: z.ZodObject<any>;

  /**
   * Human-readable description of the element
   */
  description: string;

  /**
   * The documentation for the element in markdown format
   */
  documentation: string;

  /**
   * Array of parent elements that this element can be nested under
   */
  requiredParent?: string[];
  /**
   * Whether this element can be used as a root element
   */
  isRoot?: boolean;
}

/**
 * Definition for a specific element type
 */
export type ElementDefinition<
  PropSchema extends z.ZodObject<any> = z.ZodObject<any>,
  Props extends z.infer<PropSchema> = z.infer<PropSchema>,
  Result = any,
  Tag extends ElementType = ElementType,
> = {
  tag: Tag;
  role: ElementRole;
  elementType: Tag;
  propsSchema: PropSchema;
  allowedChildren?: AllowedChildrenType | ((props: Props) => string[]);
  description?: string;
  documentation?: string;
};
