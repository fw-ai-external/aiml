import type { z } from "zod";
import type { Secrets, StepValueResult } from "./values";
import type { CoreAssistantMessage, CoreUserMessage, UserContent } from "ai";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
import type { CoreToolMessage } from "@mastra/core";
import type {
  ActionStep,
  BranchingStep,
  ParamElement,
  StateStep,
} from "./graph";

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
 * Element roles define the general category of an element
 */
export type ElementType =
  | StateStep["type"]
  | ActionStep["type"]
  | ParamElement["type"]
  | BranchingStep["type"];

export type ElementSubType =
  | StateStep["subType"]
  | ActionStep["subType"]
  | ParamElement["subType"]
  | BranchingStep["subType"];

/*
 * Defines what types of children an element can have
 */
export type AllowedChildrenType = string[] | "none" | "any" | "text";

/**
 * Maps element types to their roles
 */
export const elementRoleMap: Record<
  (typeof aimlElements)[number],
  ElementType
> = {
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
  llm: "action",
  toolcall: "action",
  log: "action",
  sendText: "action",
  sendToolCalls: "action",
  sendObject: "action",
  onerror: "action",
  onchunk: "action",
  prompt: "action",
  instructions: "action",
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
  | "field"
  | "code";

/**
 * Base interface for all AIML nodes in the AST
 * Renamed from AIMLNode to SerializedBaseElement for better semantic clarity
 */
export interface SerializedBaseElement {
  astSourceType: ASTNodeType;
  id?: string;
  key: string;
  tag?: string;
  type?: ElementType;
  subType?: ElementSubType;
  elementType?: ElementType;
  attributes?: Attributes;
  children?: SerializedBaseElement[];
  parentId?: string;
  scope: string[];
  value?: string | number | boolean;
  language?: string; // For code nodes
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
 * Code node in the AIML AST
 */
export interface CodeBlock extends SerializedBaseElement {
  kind: "code";
  language: "javascript" | "python";
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
  tag: (typeof aimlElements)[number];

  /**
   * The role of the element
   */
  type: ElementType;

  /**
   * The sub-type of the element
   */
  subType?: ElementSubType;

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
  Tag extends (typeof aimlElements)[number] = (typeof aimlElements)[number]
> = {
  tag: Tag;
  type: ElementType;
  subType?: ElementSubType;
  propsSchema: PropSchema;
  allowedChildren?: AllowedChildrenType | ((props: Props) => string[]);
  description?: string;
  documentation?: string;
};

export type ElementExecutionContextSerialized = {
  id: string;
  props: Record<string, any>;
  input: StepValueResult;
  datamodel: Record<string, any>;
  requestInput: {
    userMessage: UserContent;
    systemMessage?: string;
    chatHistory: Array<
      CoreUserMessage | CoreAssistantMessage | CoreToolMessage
    >;
    clientSideTools: ChatCompletionMessageToolCall.Function[];
  };
  machine: {
    id: string;
    secrets: Secrets;
  };
  state: {
    id: string;
    props: Record<string, any>;
    input: StepValueResult;
  };
  run: {
    id: string;
  };
  element?: SerializedBaseElement;
};
