import { TextDocument } from "vscode-languageserver-textdocument";
import { Token } from "../acorn";

export interface ValidationContext {
  document: TextDocument;
  content: string;
  tokens: Token[];
}

export interface StateCollection {
  stateIds: Set<string>;
  invalidTargets: Set<string>;
}
