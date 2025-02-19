import { TextDocument } from "vscode-languageserver-textdocument";
import { DocumentValidator } from "./validator";
import { StateTracker } from "./stateTracker";
import { Connection, DiagnosticSeverity } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, jest, mock } from "bun:test";
import { z } from "zod";
import { parseToTokens, Token } from "../acorn";

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

      const tokens: Token[] = parseToTokens(document.getText());

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

    it("should validate transition target states", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        '<state id="idle"/><transition target="unknown"/>'
      );

      const tokens = parseToTokens(document.getText());

      const diagnostics = validator.validateDocument(document, tokens);

      console.log(diagnostics);

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

      const tokens: Token[] = parseToTokens(document.getText());

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

      const tokens: Token[] = parseToTokens(document.getText());

      validator.validateDocument(document, tokens);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: document.uri,
        diagnostics: [],
      });
    });
  });
});
