export * from "./errors";
export * from "./utils";
import { z } from "zod";

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
] as const;

export type ElementType = (typeof aimlElements)[number];

export type ElementRole =
  | "state"
  | "action"
  | "error"
  | "user-input"
  | "output";

export type AllowedChildrenType = string[] | "none" | "any" | "text";

export type AIMLNode = {
  type:
    | "text"
    | "comment"
    | "element"
    | "import"
    | "header"
    | "headerField"
    | "field";
  id?: string;
  key: string;
  tag?: string;
  role?: ElementRole;
  elementType?: ElementType;
  attributes?: Attributes;
  children?: AIMLNode[];
  parent?: IBaseElement;
  value?: string | number | boolean;
  filePath?: string;
  namedImports?: string[];
  defaultImport?: string;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
};

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

export interface Attributes {
  [key: string]: string | number | undefined;
}

export interface IBaseElement extends AIMLNode {
  type: "element";
  readonly id: string;
  readonly key: string;
  readonly tag: string;
  readonly role: ElementRole;
  readonly elementType: ElementType;
  readonly attributes: Attributes;
  readonly children: AIMLNode[];
  readonly onExecutionGraphConstruction?: (buildContext: any) => any;
  readonly allowedChildren: AllowedChildrenType;
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
  onExecutionGraphConstruction?: (buildContext: any) => any;
  propsSchema?: any;
  description?: string;
  documentation?: string;
  allowedChildren: AllowedChildrenType;
  schema: z.ZodType<any>;
  type: "element";
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}
