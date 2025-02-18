import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionProvider } from "./completion";
import { StateTracker } from "./stateTracker";
import { TokenType } from "../token";
import { Connection, CompletionItemKind } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, mock } from "bun:test";

interface TokenResult {
  token:
    | { type: TokenType; startIndex: number; endIndex: number; index: number }
    | undefined;
  prevToken:
    | { type: TokenType; startIndex: number; endIndex: number; index: number }
    | undefined;
  all: Array<{
    type: TokenType;
    startIndex: number;
    endIndex: number;
    index: number;
  }>;
  index: number;
}

// Mock element configs
mock.module("@workflow/element-types", () => ({
  allElementConfigs: {
    state: {
      documentation: "State element documentation",
      propsSchema: {
        shape: {
          id: { constructor: { name: "ZodString" } },
          final: { constructor: { name: "ZodBoolean" } },
          type: {
            constructor: { name: "ZodEnum" },
            _def: { values: ["state", "parallel", "final"] },
          },
        },
      },
    },
  },
}));

// Mock buildActiveToken function
const mockBuildActiveToken = mock<
  (
    _connection: Connection,
    _document: TextDocument,
    _content: string,
    _offset: number
  ) => TokenResult
>(() => ({
  token: undefined,
  prevToken: undefined,
  all: [],
  index: -1,
}));

// Mock dependencies
const mockConnection = {
  console: {
    log: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
    info: mock(() => {}),
  },
} as unknown as Connection;

const mockLogger: Partial<DebugLogger> = {
  completion: mock(() => {}),
};

const mockStateTracker = {
  getStatesForDocument: mock(() => new Set<string>()),
};

mock.module("../../token", () => ({
  TokenType,
  buildActiveToken: mockBuildActiveToken,
}));

describe("CompletionProvider", () => {
  let provider: CompletionProvider;

  beforeEach(() => {
    provider = new CompletionProvider(
      mockConnection as Connection,
      mockLogger as DebugLogger,
      mockStateTracker as unknown as StateTracker
    );
    mock.restore();
  });

  describe("getCompletions", () => {
    it("should provide element completions at start of document", () => {
      const document = TextDocument.create("test.aiml", "aiml", 1, "<");
      const position = { line: 0, character: 1 };

      mockBuildActiveToken.mockImplementation(() => ({
        token: undefined,
        prevToken: {
          type: TokenType.StartTag,
          startIndex: 0,
          endIndex: 1,
          index: 0,
        },
        all: [
          { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        ],
        index: 0,
      }));

      const completions = provider.getCompletions(document, position);

      expect(completions.length).toBeGreaterThan(0);
      expect(completions[0]).toEqual({
        label: "state",
        kind: CompletionItemKind.Class,
        documentation: "State element documentation",
      });
    });

    it("should provide attribute completions after element name", () => {
      const document = TextDocument.create("test.aiml", "aiml", 1, "<state ");
      const position = { line: 0, character: 7 };

      mockBuildActiveToken.mockImplementation(() => ({
        token: undefined,
        prevToken: {
          type: TokenType.TagName,
          startIndex: 1,
          endIndex: 6,
          index: 1,
        },
        all: [
          { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
          { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        ],
        index: 1,
      }));

      const completions = provider.getCompletions(document, position);

      expect(completions.length).toBeGreaterThan(0);
      expect(completions).toContainEqual({
        label: "id",
        kind: CompletionItemKind.Property,
        documentation: "Attribute for state element",
      });
    });

    it("should provide state ID completions for transition target", () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        '<transition target="'
      );
      const position = { line: 0, character: 19 };

      mockBuildActiveToken.mockImplementation(() => ({
        token: undefined,
        prevToken: {
          type: TokenType.Equal,
          startIndex: 17,
          endIndex: 18,
          index: 3,
        },
        all: [
          { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
          { type: TokenType.TagName, startIndex: 1, endIndex: 10, index: 1 },
          {
            type: TokenType.AttributeName,
            startIndex: 11,
            endIndex: 17,
            index: 2,
          },
          { type: TokenType.Equal, startIndex: 17, endIndex: 18, index: 3 },
        ],
        index: 3,
      }));

      mockStateTracker.getStatesForDocument.mockImplementation(
        () => new Set(["idle", "active"])
      );

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual([
        {
          label: "idle",
          kind: CompletionItemKind.Reference,
          documentation: 'Reference to state with id="idle"',
        },
        {
          label: "active",
          kind: CompletionItemKind.Reference,
          documentation: 'Reference to state with id="active"',
        },
      ]);
    });

    it("should provide boolean completions for boolean attributes", () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        "<llm includeChatHistory={"
      );
      const position = { line: 0, character: 14 };

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual([
        { label: "true", kind: CompletionItemKind.Value },
        { label: "false", kind: CompletionItemKind.Value },
      ]);
    });

    it.skip("should provide enum completions for enum attributes", () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        '<llm responseFormat="'
      );
      const position = {
        line: 0,
        character: "<llm responseFormat=".length,
      };

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual([
        {
          label: "json",
          kind: CompletionItemKind.Property,
          documentation: "State element documentation",
        },
        {
          label: "text",
          kind: CompletionItemKind.Property,
          documentation: "Valid value for type",
        },
        {
          label: "gbnf",
          kind: CompletionItemKind.Property,
          documentation: "Valid value for type",
        },
      ]);
    });

    it("should return empty array when no completions are available", () => {
      const document = TextDocument.create("test.aiml", "aiml", 1, "");
      const position = { line: 0, character: 0 };

      mockBuildActiveToken.mockImplementation(() => ({
        token: undefined,
        prevToken: undefined,
        all: [],
        index: -1,
      }));

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual([]);
    });
  });
});
