import type { DiagnosticSeverity, Range } from 'vscode-languageserver/node';

export interface DiagnosticExpectation {
  message: string;
  severity?: DiagnosticSeverity;
  range?: Range;
}
