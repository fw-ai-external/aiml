import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionProvider } from "./completion";
import { Connection, CompletionItemKind } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, mock } from "bun:test";
import { type Token, parseToTokens } from "../acorn";

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
  state: mock(() => {}),
  info: mock(() => {}),
  token: mock(() => {}),
};

describe("CompletionProvider", () => {
  let provider: CompletionProvider;
  // @ts-expect-error
  let stateTracker: StateTracker;

  beforeEach(() => {
    mock.restore();
    // @ts-expect-error
    stateTracker = new StateTracker(mockLogger as DebugLogger);
    provider = new CompletionProvider(
      mockConnection as Connection,
      mockLogger as DebugLogger,
      stateTracker
    );
  });

  describe("getCompletions", () => {
    it("should provide element completions at start of document", () => {
      const document = TextDocument.create("test.aiml", "aiml", 1, "<");
      const position = { line: 0, character: 1 };
      const tokens = parseToTokens(document.getText());

      stateTracker.trackStates(document, tokens);
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
      const tokens = parseToTokens(document.getText());

      stateTracker.trackStates(document, tokens);
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
      // First set up a state with id="idle"
      const stateDoc = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        '<state id="idle"/><state id="active"/>'
      );
      const stateTokens = parseToTokens(stateDoc.getText());
      stateTracker.trackStates(stateDoc, stateTokens);

      // Now test transition target completion
      const transitionDoc = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        '<transition target="'
      );
      const tokens = parseToTokens(transitionDoc.getText());
      stateTracker.trackStates(transitionDoc, tokens);

      const position = { line: 0, character: 19 };
      const completions = provider.getCompletions(transitionDoc, position);

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
      const tokens = parseToTokens(document.getText());

      stateTracker.trackStates(document, tokens);
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
      const tokens = parseToTokens(document.getText());

      stateTracker.trackStates(document, tokens);
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
      const tokens = parseToTokens(document.getText());

      stateTracker.trackStates(document, tokens);
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

    it("should handle nested element completions", () => {
      const document = TextDocument.create("test.aiml", "aiml", 1, "<state><");
      const position = { line: 0, character: 7 };
      const tokens = parseToTokens(document.getText());

      stateTracker.trackStates(document, tokens);
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
        context: {
          parentTagName: "state",
        },
      });
    });

    it("should handle error cases gracefully", () => {
      const document = TextDocument.create("test.aiml", "aiml", 1, "<invalid");
      const position = { line: 0, character: 8 };
      const tokens = parseToTokens(document.getText());

      stateTracker.trackStates(document, tokens);
      const completions = provider.getCompletions(document, position);

      expect(completions).toEqual({
        completions: [],
        type: "attribute_name",
        context: {
          tagName: "invalid",
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
