import { BaseElement } from "@fireworks/core";
import { Node, SourceFile } from "ts-morph";

export interface MDXParserOptions {
  strict?: boolean;
  validateSchema?: boolean;
}

export interface MDXParseResult {
  ast: BaseElement;
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
  parents: BaseElement[];
}
