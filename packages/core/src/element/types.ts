import { BaseElement } from "../runtime/BaseElement";

/***************************************************
 * 1. Basic Types
 ***************************************************/
export interface InstructionNode {
  kind: "instruction";
  key?: string;
  instruction: string;
}

export interface CommentNode {
  kind: "comment";
  key?: string;
  comment: string;
}

export interface FunctionNode {
  kind: "jsx-function";
  key?: string;
  function: string;
}

export interface TextNode {
  kind: "text";
  key?: string;
  text: string | number | boolean;
}

export interface Attributes {
  [key: string]: string | number | undefined;
}

export const SCXMLNodeType = [
  "scxml",
  "state",
  "parallel",
  "final",
  "history",
  "transition",
  "onentry",
  "onexit",
  "datamodel",
  "data",
  "script",
  "raise",
  "send",
  "log",
  "assign",
  "if",
  "elseif",
  "else",
  "foreach",
  "cancel",
  "invoke",
  "finalize",
  "param",
  "content",
] as const;

export type SCXMLNodeType = (typeof SCXMLNodeType)[number] & string;

export type FireAgentSpecNode =
  | TextNode
  | CommentNode
  | InstructionNode
  | FunctionNode
  | BaseElement;
