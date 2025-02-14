import { Diagnostic } from "vscode-languageserver";
import { findAttributeDiagnostics } from "./findAttributeDiagnostics";
import { findEmptyBlocksDiagnostics } from "./findEmptyBlocksDiagnostics";
import { findFrontmatterDiagnostics } from "./findFrontmatterDiagnostics";
import { findUnmatchedTagsDiagnostics } from "./findUnmatchedTagsDiagnostics";
import { findUnsupportedTagsDiagnostics } from "./findUnsupportedTagsDiagnostics";
import { TextDocument } from "vscode-languageserver-textdocument";

export function getDiagnostics(textDocument: TextDocument): Diagnostic[] {
  try {
    return [
      ...findAttributeDiagnostics(textDocument),
      ...findEmptyBlocksDiagnostics(textDocument),
      ...findFrontmatterDiagnostics(textDocument),
      ...findUnmatchedTagsDiagnostics(textDocument),
      ...findUnsupportedTagsDiagnostics(textDocument),
    ];
  } catch {
    return [];
  }
}
