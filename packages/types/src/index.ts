import { z } from "zod";

export * from "./errors";
export * from "./utils";

/**
 * All possible SCXML node types.
 * This must match exactly with BaseElement.ts's definition.
 */
export type SCXMLNodeType =
  | "state"
  | "parallel"
  | "transition"
  | "final"
  | "history"
  | "onentry"
  | "onexit"
  | "initial"
  | "datamodel"
  | "data"
  | "assign"
  | "donedata"
  | "content"
  | "param"
  | "script"
  | "send"
  | "cancel"
  | "if"
  | "elseif"
  | "else"
  | "foreach"
  | "log"
  | "raise"
  | "scxml"
  | "on"
  | "invoke"
  | "finalize"
  | "llm";

export type ElementRole =
  | "state"
  | "action"
  | "error"
  | "user-input"
  | "output";

export type AllowedChildrenType = string[] | "none" | "any" | "text";

export interface InstructionNode {
  kind: "instruction";
  key?: string;
  name?: undefined;
  scxmlType?: undefined;
  instruction: string;
  text?: undefined;
  comment?: undefined;
  nodes?: undefined;
  attributes?: undefined;
}

export interface CommentNode {
  kind: "comment";
  key?: string;
  name?: undefined;
  scxmlType?: undefined;
  comment: string;
  text?: undefined;
  instruction?: undefined;
  nodes?: undefined;
  attributes?: undefined;
}

export interface TextNode {
  kind: "text";
  key?: string;
  name?: undefined;
  scxmlType?: undefined;
  text: string | number | boolean;
  comment?: undefined;
  instruction?: undefined;
  nodes?: undefined;
  attributes?: undefined;
}

export interface Attributes {
  [key: string]: string | number | undefined;
}

export interface IBaseElement {
  readonly id: string;
  readonly key: string;
  readonly tag: string;
  readonly role: ElementRole;
  readonly elementType: SCXMLNodeType;
  readonly attributes: Record<string, any>;
  readonly children: IBaseElement[];
  readonly onExecutionGraphConstruction?: (buildContext: any) => any;
  enter?: () => Promise<void>;
  exit?: () => Promise<void>;
  allowedChildren: AllowedChildrenType;
  schema: z.ZodType<any>;
}

export interface IBaseElementConfig {
  id: string;
  key: string;
  tag: string;
  role: ElementRole;
  elementType: SCXMLNodeType;
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
}

export type FireAgentNode =
  | TextNode
  | CommentNode
  | InstructionNode
  | IBaseElement
  | {
      kind: "tag";
      key: string;
      name: string;
      scxmlType: SCXMLNodeType;
      attributes: Attributes;
      nodes?: Array<FireAgentNode>;
      parents?: Array<{ name: string; id: string }>;
      isRendered?: boolean;
      text?: undefined;
      comment?: undefined;
      instruction?: undefined;
      initiatedfrom?: "render" | "spec";
    };
