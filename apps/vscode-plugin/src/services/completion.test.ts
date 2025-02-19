import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionProvider } from "./completion";
import { StateTracker } from "./stateTracker";
import { Connection, CompletionItemKind } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, mock } from "bun:test";
import { TokenType, type Token } from "../acorn";

interface TokenResult {
  token: Token | undefined;
  prevToken: Token | undefined;
  all: Token[];
  index: number;
}

// Mock only the necessary dependencies
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
  error: mock(() => {}),
};

const mockStateTracker = {
  getStatesForDocument: mock(() => new Set(["idle", "active"])),
};

// Reset mock state tracker before each test
beforeEach(() => {
  mockStateTracker.getStatesForDocument.mockReset();
  mockStateTracker.getStatesForDocument.mockReturnValue(
    new Set(["idle", "active"])
  );
});

// Mock parseToTokens to return the tokens array from each test
let currentTokens: Token[] = [];
mock.module("../acorn", () => ({
  TokenType,
  parseToTokens: () => currentTokens,
}));

describe("CompletionProvider", () => {
  let provider: CompletionProvider;

  beforeEach(() => {
    mock.restore();

    // Re-setup the mocks after restore
    mock.module("../acorn", () => ({
      TokenType,
      parseToTokens: () => currentTokens,
    }));

    // Re-setup token utilities mock
    mock.module("../utils/token", () => ({
      buildActiveToken: (tokens: Token[], offset: number) => {
        if (tokens.length === 0) {
          return {
            token: undefined,
            prevToken: undefined,
            all: tokens,
            index: -1,
          };
        }

        // For start tag, we want to return prevToken as the start tag
        if (tokens.length === 1 && tokens[0].type === TokenType.StartTag) {
          return {
            token: undefined,
            prevToken: tokens[0],
            all: tokens,
            index: 0,
          };
        }

        // For attribute value completions, we want to return the current token and the Equal token as prevToken
        const lastToken = tokens[tokens.length - 1];
        if (
          lastToken.type === TokenType.String ||
          lastToken.type === TokenType.AttributeExpression
        ) {
          return {
            token: lastToken,
            prevToken: tokens[tokens.length - 2], // Equal token
            all: tokens,
            index: 4, // Fixed index for attribute value completions
          };
        }

        // For attribute name completions, we want to return the whitespace token
        if (tokens.length >= 3 && tokens[2].type === TokenType.Whitespace) {
          return {
            token: tokens[2],
            prevToken: tokens[1],
            all: tokens,
            index: 2,
          };
        }

        return {
          token: undefined,
          prevToken: undefined,
          all: tokens,
          index: -1,
        };
      },
      getOwnerAttributeName: (tokens: Token[], index: number) => {
        // Look backwards from the current index for the attribute name
        for (let i = index; i >= 0; i--) {
          if (tokens[i].type === TokenType.AttributeName) {
            return tokens[i];
          }
        }
        return null;
      },
      getOwnerTagName: (tokens: Token[], index: number) => {
        // Look backwards from the current index for the tag name
        for (let i = index; i >= 0; i--) {
          if (tokens[i].type === TokenType.TagName) {
            return tokens[i];
          }
        }
        return null;
      },
    }));

    // Re-setup element-types mock
    mock.module("@workflow/element-types", () => ({
      allElementConfigs: {
        state: {
          documentation: "Basic state container",
          propsSchema: {
            shape: {
              id: {},
              initial: {},
            },
          },
        },
        llm: {
          propsSchema: {
            shape: {
              includeChatHistory: {
                _def: {
                  typeName: "ZodBoolean",
                },
              },
            },
          },
        },
        scxml: {
          propsSchema: {
            shape: {
              binding: {
                _def: {
                  typeName: "ZodEnum",
                  values: ["early", "late"],
                },
              },
            },
          },
        },
        transition: {
          propsSchema: {
            shape: {
              target: {},
            },
          },
        },
      },
    }));

    provider = new CompletionProvider(
      mockConnection as Connection,
      mockLogger as DebugLogger,
      mockStateTracker as unknown as StateTracker
    );
  });

  describe("getCompletions", () => {
    it("should provide element completions at start of document", () => {
      const document = TextDocument.create("test.aiml", "aiml", 1, "<");
      const position = { line: 0, character: 1 };

      currentTokens = [
        {
          type: TokenType.StartTag,
          startIndex: 0,
          endIndex: 1,
          index: 0,
          raw: "<",
          text: "<",
        },
      ];

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual({
        completions: expect.arrayContaining([
          {
            label: "state",
            kind: CompletionItemKind.Class,
            documentation: "Basic state container",
          },
        ]),
        type: "tag_name",
        context: {},
      });
    });

    it("should provide attribute completions after element name", () => {
      const document = TextDocument.create("test.aiml", "aiml", 1, "<state ");
      const position = { line: 0, character: 7 };

      currentTokens = [
        {
          type: TokenType.StartTag,
          startIndex: 0,
          endIndex: 1,
          index: 0,
          raw: "<",
          text: "<",
        },
        {
          type: TokenType.TagName,
          startIndex: 1,
          endIndex: 6,
          index: 1,
          raw: "state",
          text: "state",
        },
        {
          type: TokenType.Whitespace,
          startIndex: 6,
          endIndex: 7,
          index: 2,
          raw: " ",
          text: " ",
        },
      ];

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual({
        completions: expect.arrayContaining([
          {
            label: "id",
            kind: CompletionItemKind.Property,
            documentation: "Attribute for state element",
          },
          {
            label: "initial",
            kind: CompletionItemKind.Property,
            documentation: "Attribute for state element",
          },
        ]),
        type: "attribute_name",
        context: {
          tagName: "state",
        },
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

      currentTokens = [
        {
          type: TokenType.StartTag,
          startIndex: 0,
          endIndex: 1,
          index: 0,
          raw: "<",
          text: "<",
        },
        {
          type: TokenType.TagName,
          startIndex: 1,
          endIndex: 10,
          index: 1,
          raw: "transition",
          text: "transition",
        },
        {
          type: TokenType.AttributeName,
          startIndex: 11,
          endIndex: 17,
          index: 2,
          raw: "target",
          text: "target",
        },
        {
          type: TokenType.Equal,
          startIndex: 17,
          endIndex: 18,
          index: 3,
          raw: "=",
          text: "=",
        },
        {
          type: TokenType.String,
          startIndex: 18,
          endIndex: 19,
          index: 4,
          raw: '"',
          text: "",
        },
      ];

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual({
        completions: [
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
        ],
        type: "attribute_value",
        context: {
          tagName: "transition",
          attributeName: "target",
        },
      });
    });

    it("should provide boolean completions for JSX-style boolean attributes", () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        "<llm includeChatHistory={"
      );
      const position = { line: 0, character: 23 };

      currentTokens = [
        {
          type: TokenType.StartTag,
          startIndex: 0,
          endIndex: 1,
          index: 0,
          raw: "<",
          text: "<",
        },
        {
          type: TokenType.TagName,
          startIndex: 1,
          endIndex: 4,
          index: 1,
          raw: "llm",
          text: "llm",
        },
        {
          type: TokenType.AttributeName,
          startIndex: 5,
          endIndex: 22,
          index: 2,
          raw: "includeChatHistory",
          text: "includeChatHistory",
        },
        {
          type: TokenType.Equal,
          startIndex: 22,
          endIndex: 23,
          index: 3,
          raw: "=",
          text: "=",
        },
        {
          type: TokenType.AttributeExpression,
          startIndex: 23,
          endIndex: 24,
          index: 4,
          raw: "{",
          text: "",
        },
      ];

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual({
        completions: [
          { label: "true", kind: CompletionItemKind.Value },
          { label: "false", kind: CompletionItemKind.Value },
        ],
        type: "attribute_value",
        context: {
          tagName: "llm",
          attributeName: "includeChatHistory",
        },
      });
    });

    it("should provide boolean completions for HTML-style boolean attributes", () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        '<llm includeChatHistory="'
      );
      const position = { line: 0, character: 23 };

      currentTokens = [
        {
          type: TokenType.StartTag,
          startIndex: 0,
          endIndex: 1,
          index: 0,
          raw: "<",
          text: "<",
        },
        {
          type: TokenType.TagName,
          startIndex: 1,
          endIndex: 4,
          index: 1,
          raw: "llm",
          text: "llm",
        },
        {
          type: TokenType.AttributeName,
          startIndex: 5,
          endIndex: 22,
          index: 2,
          raw: "includeChatHistory",
          text: "includeChatHistory",
        },
        {
          type: TokenType.Equal,
          startIndex: 22,
          endIndex: 23,
          index: 3,
          raw: "=",
          text: "=",
        },
        {
          type: TokenType.String,
          startIndex: 23,
          endIndex: 24,
          index: 4,
          raw: '"',
          text: "",
        },
      ];

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual({
        completions: [
          { label: "true", kind: CompletionItemKind.Value },
          { label: "false", kind: CompletionItemKind.Value },
        ],
        type: "attribute_value",
        context: {
          tagName: "llm",
          attributeName: "includeChatHistory",
        },
      });
    });

    it("should provide enum completions for binding attribute", () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        '<scxml binding="'
      );
      const position = { line: 0, character: 15 };

      currentTokens = [
        {
          type: TokenType.StartTag,
          startIndex: 0,
          endIndex: 1,
          index: 0,
          raw: "<",
          text: "<",
        },
        {
          type: TokenType.TagName,
          startIndex: 1,
          endIndex: 6,
          index: 1,
          raw: "scxml",
          text: "scxml",
        },
        {
          type: TokenType.AttributeName,
          startIndex: 7,
          endIndex: 14,
          index: 2,
          raw: "binding",
          text: "binding",
        },
        {
          type: TokenType.Equal,
          startIndex: 14,
          endIndex: 15,
          index: 3,
          raw: "=",
          text: "=",
        },
        {
          type: TokenType.String,
          startIndex: 15,
          endIndex: 16,
          index: 4,
          raw: '"',
          text: "",
        },
      ];

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual({
        completions: [
          {
            label: "early",
            kind: CompletionItemKind.Property,
            documentation: "Valid value for binding",
          },
          {
            label: "late",
            kind: CompletionItemKind.Property,
            documentation: "Valid value for binding",
          },
        ],
        type: "attribute_value",
        context: {
          tagName: "scxml",
          attributeName: "binding",
        },
      });
    });

    it("should return empty array when no completions are available", () => {
      const document = TextDocument.create("test.aiml", "aiml", 1, "");
      const position = { line: 0, character: 0 };

      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual({ completions: [], type: "tag_name" });
    });
  });
});
