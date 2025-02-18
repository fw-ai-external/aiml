import { TextDocument } from "vscode-languageserver-textdocument";
import { DocumentValidator } from "./validator";
import { StateTracker } from "./stateTracker";
import { Token, TokenType } from "../token";
import { Connection, DiagnosticSeverity } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, jest } from "bun:test";

// Mock dependencies
const mockConnection: Partial<Connection> = {
  sendDiagnostics: jest.fn(),
};

const mockLogger: Partial<DebugLogger> = {
  validation: jest.fn(),
};

const mockStateTracker = {
  trackStates: jest.fn(),
  getStatesForDocument: jest.fn(),
};

describe("DocumentValidator", () => {
  let validator: DocumentValidator;

  beforeEach(() => {
    validator = new DocumentValidator(
      mockConnection as Connection,
      mockLogger as DebugLogger,
      mockStateTracker as unknown as StateTracker
    );
    jest.clearAllMocks();
  });

  describe("validateDocument", () => {
    it("should detect duplicate attributes", () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        '<state id="idle" id="active"/>'
      );

      const tokens: Token[] = [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        { type: TokenType.AttributeName, startIndex: 7, endIndex: 9, index: 2 },
        { type: TokenType.Equal, startIndex: 9, endIndex: 10, index: 3 },
        { type: TokenType.String, startIndex: 10, endIndex: 16, index: 4 },
        {
          type: TokenType.AttributeName,
          startIndex: 17,
          endIndex: 19,
          index: 5,
        },
        { type: TokenType.Equal, startIndex: 19, endIndex: 20, index: 6 },
        { type: TokenType.String, startIndex: 20, endIndex: 28, index: 7 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 28,
          endIndex: 30,
          index: 8,
        },
      ];

      validator.validateDocument(document, tokens);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: document.uri,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            severity: DiagnosticSeverity.Error,
            message: expect.stringContaining("Duplicate attribute 'id' found"),
          }),
        ]),
      });
    });

    it("should validate transition target states", () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        '<transition target="unknown"/>'
      );

      const tokens: Token[] = [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 10, index: 1 },
        {
          type: TokenType.AttributeName,
          startIndex: 11,
          endIndex: 17,
          index: 2,
        },
        { type: TokenType.Equal, startIndex: 17, endIndex: 18, index: 3 },
        { type: TokenType.String, startIndex: 18, endIndex: 27, index: 4 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 27,
          endIndex: 29,
          index: 5,
        },
      ];

      mockStateTracker.getStatesForDocument.mockReturnValue(
        new Set(["idle", "active"])
      );

      validator.validateDocument(document, tokens);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: document.uri,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            severity: DiagnosticSeverity.Error,
            message: expect.stringContaining(
              "Target state 'unknown' not found. Available states: idle, active"
            ),
          }),
        ]),
      });
    });

    it("should validate enum attribute values", () => {
      const document = TextDocument.create(
        "test.xml",
        "aiml",
        1,
        '<state type="invalid"/>'
      );

      const tokens: Token[] = [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        {
          type: TokenType.AttributeName,
          startIndex: 7,
          endIndex: 11,
          index: 2,
        },
        { type: TokenType.Equal, startIndex: 11, endIndex: 12, index: 3 },
        { type: TokenType.String, startIndex: 12, endIndex: 21, index: 4 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 21,
          endIndex: 23,
          index: 5,
        },
      ];

      validator.validateDocument(document, tokens);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: document.uri,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            severity: DiagnosticSeverity.Error,
            message: expect.stringContaining("Value must be one of:"),
          }),
        ]),
      });
    });

    it("should validate boolean attribute values", () => {
      const document = TextDocument.create(
        "test.xml",
        "aiml",
        1,
        '<state final="maybe"/>'
      );

      const tokens: Token[] = [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        {
          type: TokenType.AttributeName,
          startIndex: 7,
          endIndex: 12,
          index: 2,
        },
        { type: TokenType.Equal, startIndex: 12, endIndex: 13, index: 3 },
        { type: TokenType.String, startIndex: 13, endIndex: 20, index: 4 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 20,
          endIndex: 22,
          index: 5,
        },
      ];

      validator.validateDocument(document, tokens);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: document.uri,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            severity: DiagnosticSeverity.Error,
            message: expect.stringContaining("Value must be 'true' or 'false'"),
          }),
        ]),
      });
    });

    it("should not report errors for valid documents", () => {
      const document = TextDocument.create(
        "test.xml",
        "aiml",
        1,
        '<state id="idle" final="true"/>'
      );

      const tokens: Token[] = [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        { type: TokenType.AttributeName, startIndex: 7, endIndex: 9, index: 2 },
        { type: TokenType.Equal, startIndex: 9, endIndex: 10, index: 3 },
        { type: TokenType.String, startIndex: 10, endIndex: 16, index: 4 },
        {
          type: TokenType.AttributeName,
          startIndex: 17,
          endIndex: 22,
          index: 5,
        },
        { type: TokenType.Equal, startIndex: 22, endIndex: 23, index: 6 },
        { type: TokenType.String, startIndex: 23, endIndex: 29, index: 7 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 29,
          endIndex: 31,
          index: 8,
        },
      ];

      validator.validateDocument(document, tokens);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: document.uri,
        diagnostics: [],
      });
    });
  });
});
