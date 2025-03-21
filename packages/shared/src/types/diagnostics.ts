// Define diagnostics types
export enum DiagnosticSeverity {
  Error = 'error',
  Warning = 'warning',
  Information = 'information',
  Hint = 'hint',
}

export interface DiagnosticPosition {
  line: number;
  column: number;
}

export interface Diagnostic {
  message: string;
  severity: DiagnosticSeverity;
  code?: string;
  source?: string;
  range: {
    start: DiagnosticPosition;
    end: DiagnosticPosition;
  };
}
