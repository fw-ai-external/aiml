export * from "./errors";
export * from "./utils";
export * from "./runtime";
export * from "./errorCodes";
export * from "./diagnostics";
import { z } from "zod";
import type { BuildContext } from "./runtime";
import type { ExecutionGraphElement } from "./runtime";

/**
 * All possible SCXML node types.
 * This must match exactly with BaseElement.ts's definition.
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
  // Add SCXML specific node types
  "scxml",
  "initial",
  "history",
  "donedata",
  "content",
  "param",
  "invoke",
  "finalize",
] as const;

export type ElementType = (typeof aimlElements)[number];

// Export SCXMLNodeType as an alias for ElementType
export type SCXMLNodeType = ElementType;

export type ElementRole =
  | "state"
  | "action"
  | "error"
  | "user-input"
  | "output";

export type AllowedChildrenType = string[] | "none" | "any" | "text";

export type AIMLNode = {
  type:
    | "paragraph"
    | "text"
    | "comment"
    | "element"
    | "import"
    | "header"
    | "expression"
    | "headerField"
    | "field";
  id?: string;
  key: string;
  tag?: string;
  role?: ElementRole;
  elementType?: ElementType;
  attributes?: Attributes;
  children?: AIMLNode[];
  parent?: WeakRef<AIMLNode>;
  value?: string | number | boolean;
  filePath?: string;
  namedImports?: string[];
  defaultImport?: string;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
  comments?: CommentNode[];
};
// comment nodes need to be added to the nearest IBaseElement after them via a new field on IBaseElement for comments

export interface ImportNode extends AIMLNode {
  kind: "import";
  filePath: string;
  namedImports?: string[];
  defaultImport?: string;
}

export interface HeaderNode extends AIMLNode {
  kind: "header";
  children: HeaderFieldNode[];
}

export interface HeaderFieldNode extends AIMLNode {
  kind: "headerField";
  id: string;
  value: string;
}

export interface CommentNode extends AIMLNode {
  kind: "comment";
  value: string;
}

export interface TextNode extends AIMLNode {
  kind: "text";
  value: string | number | boolean;
}

export interface ExpressionNode extends AIMLNode {
  kind: "expression";
  value: string;
}

export interface ParagraphNode extends AIMLNode {
  kind: "paragraph";
  children: (TextNode | ExpressionNode)[];
}

export interface Attributes {
  [key: string]: string | number | undefined | boolean;
}

export interface IBaseElement extends AIMLNode, input {
  type: "element";
  readonly id: string;
  readonly key: string;
  readonly tag: string;
  readonly role: ElementRole;
  readonly elementType: ElementType;
  readonly attributes: Attributes;
  readonly children: AIMLNode[];
  readonly onExecutionGraphConstruction: (
    buildContext: BuildContext
  ) => ExecutionGraphElement;
  readonly allowedChildren: AllowedChildrenType;
  readonly comments?: CommentNode[];
}

export interface IBaseElementConfig {
  id: string;
  key: string;
  tag: string;
  role: ElementRole;
  elementType: ElementType;
  attributes?: Record<string, any>;
  children?: IBaseElement[];
  parent?: IBaseElement;
  enter?: () => Promise<void>;
  exit?: () => Promise<void>;
  onExecutionGraphConstruction: (
    buildContext: BuildContext
  ) => ExecutionGraphElement;
  propsSchema?: any;
  description?: string;
  documentation?: string;
  allowedChildren: AllowedChildrenType;
  schema: z.ZodType<any>;
  type: "element";
  execute?: any;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

// Define FireAgentNode as a more flexible extension of AIMLNode
export interface FireAgentNode extends Partial<AIMLNode> {
  name?: string;
  tag?: string;
  nodes?: FireAgentNode[];
  kind?: string;
  scxmlType?: SCXMLNodeType;
  [key: string]: any; // Allow additional properties
}

// Map of element types to roles
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
