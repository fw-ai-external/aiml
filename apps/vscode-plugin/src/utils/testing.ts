import { expect } from "vitest";
import {
  TextDocument,
  Position,
  Range,
  Diagnostic,
  DiagnosticSeverity,
} from "vscode-languageserver/node";
import { Token, TokenType } from "../token";

export interface DiagnosticExpectation {
  message: string;
  severity?: DiagnosticSeverity;
  range?: Range;
}

export function createMockDocument(content: string): TextDocument {
  return TextDocument.create("file:///test.scxml", "scxml", 1, content);
}

export function createMockToken(
  type: TokenType,
  startIndex: number,
  endIndex: number
): Token {
  return {
    type,
    startIndex,
    endIndex,
    index: 0,
  };
}

export function createMockRange(start: Position, end: Position): Range {
  return Range.create(start, end);
}

export function expectDiagnostic(
  diagnostic: Diagnostic,
  expectation: DiagnosticExpectation
) {
  expect(diagnostic.message).toContain(expectation.message);
  if (expectation.severity) {
    expect(diagnostic.severity).toBe(expectation.severity);
  }
  if (expectation.range) {
    expect(diagnostic.range).toEqual(expectation.range);
  }
}

export function createTestPosition(line: number, character: number): Position {
  return Position.create(line, character);
}

export const testDocuments = {
  empty: "",
  basic: '<state id="idle"/>',
  withTransition: '<state id="idle"/><transition target="idle"/>',
  withAttributes: '<state id="test" type="parallel" final="true"/>',
  withDuplicates: '<state id="test" id="duplicate"/>',
  withInvalidValue: '<state initial="invalid"/>',
  withInvalidTarget: '<transition target="nonexistent"/>',
};
