import { Diagnostic } from "vscode-languageserver/node";
import { Token } from "../acorn";
import { TextDocument } from "vscode-languageserver-textdocument";

export interface ValidationContext {
  document: TextDocument;
  tokens: Token[];
  content: string;
  maxProblems?: number;
}

export interface ValidationResult {
  diagnostics: Diagnostic[];
}

export interface Validator {
  validate(context: ValidationContext): ValidationResult;
}

export interface StateCollection {
  stateIds: Set<string>;
}

export interface AttributeCollection {
  elementAttributes: Map<number, Set<string>>;
}

export interface ValidationError {
  message: string;
  startIndex: number;
  endIndex: number;
  code?: string;
  data?: any;
}
