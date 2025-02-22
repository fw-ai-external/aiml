import { Node, SourceFile } from "ts-morph";
import type { SCXMLNodeType, IBaseElement } from "@fireworks/types";

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

export type TagNodeDTO<Tag extends SCXMLNodeType = SCXMLNodeType> = {
  kind: "tag";
  // The unique identifier of the element in the config.
  // It could be provided in the xml/tsx or generated when parsed
  key: string;
  // The tag name of the element in the config
  name: SCXMLNodeType | string;
  // The type of the element in the config to map to scxml behavior
  scxmlType: Tag;
  // The attributes of the element in the config (alias of props but wthout children)
  attributes: Attributes;
  // The children of the element in the config + rendered child elements
  nodes?: Array<FireAgentNode>;
  // The parents of the element in the config
  parents: {
    name: string;
    id: string;
  }[];
  // Was this element created as part of a render?
  // useful to know when convrting back to xml/tsx
  isRendered?: boolean;

  // The following are just to make TS happy...
  // they are fields from other schema node types like text and comment
  text?: undefined;
  comment?: undefined;
  instruction?: undefined;
  initiatedfrom?: "render" | "spec";
};

type NonDTO = { toDTO?: undefined };
export type FireAgentNode =
  | (TextNode & NonDTO)
  | (CommentNode & NonDTO)
  | (InstructionNode & NonDTO)
  | IBaseElement;
export type FireAgentNodeDTO =
  | TextNode
  | CommentNode
  | InstructionNode
  | TagNodeDTO;

export interface MDXParserOptions {
  strict?: boolean;
  validateSchema?: boolean;
}

export interface MDXParseResult {
  ast: IBaseElement;
  errors: MDXParseError[];
}

export interface MDXParseError {
  message: string;
  line: number;
  column: number;
  code: string;
}

export interface MDXNode {
  type: string;
  name: string;
  attributes: Record<string, string>;
  children: MDXNode[];
  parent?: MDXNode;
  line: number;
  column: number;
}

export interface MDXParseContext {
  sourceFile: SourceFile;
  currentNode: Node;
  errors: MDXParseError[];
  parents: IBaseElement[];
}
