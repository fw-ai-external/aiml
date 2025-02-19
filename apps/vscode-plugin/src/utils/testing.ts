import { Range, DiagnosticSeverity } from "vscode-languageserver/node";

export interface DiagnosticExpectation {
  message: string;
  severity?: DiagnosticSeverity;
  range?: Range;
}
