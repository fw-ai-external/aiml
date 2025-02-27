import { Node, SourceFile } from "ts-morph";
import type { IBaseElement, AIMLNode } from "@fireworks/types";

export interface AIMLParserOptions {
  strict?: boolean;
  validateSchema?: boolean;
}

export interface AIMLParseResult {
  ast: AIMLNode[];
  errors: AIMLParseError[];
}

export interface AIMLParseContext {
  sourceFile: SourceFile;
  currentNode: Node;
  errors: AIMLParseError[];
  parents: IBaseElement[];
}

export class JSXPreprocessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JSXPreprocessError";
  }
}

export class AIMLParseError extends Error {
  public line: number;
  public column: number;
  public code: string;
  public message: string;

  constructor(
    message: string,
    line: number = 1,
    column: number = 1,
    code: string = "parse_error"
  ) {
    super(message);
    this.name = "AIMLParseError";
    this.line = line;
    this.column = column;
    this.code = code;
    this.message = message;
  }
}
