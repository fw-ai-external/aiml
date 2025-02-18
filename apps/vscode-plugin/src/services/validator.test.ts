import { TextDocument } from "vscode-languageserver-textdocument";
import { DocumentValidator } from "./validator";
import { StateTracker } from "./stateTracker";
import {
  Token,
  TokenType,
  getOwnerAttributeName,
  getOwnerTagName,
} from "../token";
import { Connection, DiagnosticSeverity } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, jest, mock } from "bun:test";
import { z } from "zod";

// Mock dependencies
const mockConnection: Partial<Connection> = {
  sendDiagnostics: jest.fn(),
};

const mockLogger: Partial<DebugLogger> = {
  validation: jest.fn(),
};

const mockStateTracker = {
  trackStates: jest.fn(),
  getStatesForDocument: jest.fn().mockReturnValue(new Set()),
};

// Mock element configs to match actual schema
mock.module("@workflow/element-types", () => ({
  allElementConfigs: {
    state: {
      tag: "state",
      role: "state",
      documentation: "Basic state container",
      propsSchema: z.object({
        id: z.string(),
        initial: z.enum(["running", "stopped", "paused"]).optional(),
      }),
    },
    transition: {
      tag: "transition",
      documentation: "Transition element",
      propsSchema: z.object({
        target: z
          .string()
          .min(1)
          .refine((val) => {
            // This will be checked by validateAttributeValueByType
            return true;
          }, "Target state not found"),
      }),
    },
  },
}));

describe("DocumentValidator", () => {
  let validator: DocumentValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStateTracker.getStatesForDocument.mockReturnValue(new Set());
    mockStateTracker.trackStates.mockImplementation((doc, tokens, text) => {
      // Simulate tracking states
      const stateIds = new Set<string>();
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === TokenType.String) {
          const attrNameToken = getOwnerAttributeName(tokens, i);
          const tagNameToken = getOwnerTagName(tokens, i);

          if (attrNameToken && tagNameToken) {
            const tagName = text.substring(
              tagNameToken.startIndex,
              tagNameToken.endIndex
            );
            const attrName = text.substring(
              attrNameToken.startIndex,
              attrNameToken.endIndex
            );
            const attrValue = text.substring(
              token.startIndex + 1,
              token.endIndex - 1
            );

            if (tagName === "state" && attrName === "id") {
              stateIds.add(attrValue);
            }
          }
        }
      }
      mockStateTracker.getStatesForDocument.mockReturnValue(stateIds);
    });
    validator = new DocumentValidator(
      mockConnection as Connection,
      mockLogger as DebugLogger,
      mockStateTracker as unknown as StateTracker
    );
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
        '<state id="idle"/><transition target="unknown"/>'
      );

      const tokens: Token[] = [
        // state element
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        { type: TokenType.AttributeName, startIndex: 7, endIndex: 9, index: 2 },
        { type: TokenType.Equal, startIndex: 9, endIndex: 10, index: 3 },
        { type: TokenType.String, startIndex: 10, endIndex: 16, index: 4 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 16,
          endIndex: 18,
          index: 5,
        },
        // transition element
        { type: TokenType.StartTag, startIndex: 18, endIndex: 19, index: 6 },
        { type: TokenType.TagName, startIndex: 19, endIndex: 29, index: 7 },
        {
          type: TokenType.AttributeName,
          startIndex: 30,
          endIndex: 36,
          index: 8,
        },
        { type: TokenType.Equal, startIndex: 36, endIndex: 37, index: 9 },
        { type: TokenType.String, startIndex: 37, endIndex: 46, index: 10 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 46,
          endIndex: 48,
          index: 11,
        },
      ];

      validator.validateDocument(document, tokens);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: document.uri,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            severity: DiagnosticSeverity.Error,
            message: expect.stringContaining(
              "Target state 'unknown' not found. Available states: idle"
            ),
          }),
        ]),
      });
    });

    it("should validate required id attribute", () => {
      const document = TextDocument.create("test.xml", "aiml", 1, "<state/>");

      const tokens: Token[] = [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 6,
          endIndex: 8,
          index: 2,
        },
      ];

      validator.validateDocument(document, tokens);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: document.uri,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            severity: DiagnosticSeverity.Error,
            message: expect.stringContaining("Required"),
          }),
        ]),
      });
    });

    it("should not report errors for valid documents", () => {
      const document = TextDocument.create(
        "test.xml",
        "aiml",
        1,
        '<state id="idle" initial="running"/>'
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
          endIndex: 24,
          index: 5,
        },
        { type: TokenType.Equal, startIndex: 24, endIndex: 25, index: 6 },
        { type: TokenType.String, startIndex: 25, endIndex: 34, index: 7 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 34,
          endIndex: 36,
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
