import { TextDocument } from "vscode-languageserver-textdocument";
import { StateTracker } from "./stateTracker";
import { Token, TokenType } from "../token";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, jest, mock } from "bun:test";

// Mock element configs
mock.module("@workflow/element-types", () => ({
  allElementConfigs: {
    state: {
      tag: "state",
      role: "state",
      documentation: "Basic state container",
    },
    parallel: {
      tag: "parallel",
      role: "state",
      documentation: "Parallel state container",
    },
    final: {
      tag: "final",
      role: "state",
      documentation: "Final state",
    },
    history: {
      tag: "history",
      role: "state",
      documentation: "History state",
    },
  },
}));

// Mock the debug logger
const mockLogger: Partial<DebugLogger> = {
  state: jest.fn(),
};

describe("StateTracker", () => {
  let stateTracker: StateTracker;

  beforeEach(() => {
    stateTracker = new StateTracker(mockLogger as DebugLogger);
    jest.clearAllMocks();
  });

  describe("trackStates", () => {
    it("should track state IDs from state elements", () => {
      const document = TextDocument.create(
        "test.xml",
        "aiml",
        1,
        '<state id="idle"/><state id="active"/>'
      );

      const tokens: Token[] = [
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
        { type: TokenType.StartTag, startIndex: 18, endIndex: 19, index: 6 },
        { type: TokenType.TagName, startIndex: 19, endIndex: 24, index: 7 },
        {
          type: TokenType.AttributeName,
          startIndex: 25,
          endIndex: 27,
          index: 8,
        },
        { type: TokenType.Equal, startIndex: 27, endIndex: 28, index: 9 },
        { type: TokenType.String, startIndex: 28, endIndex: 36, index: 10 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 36,
          endIndex: 38,
          index: 11,
        },
      ];

      stateTracker.trackStates(document, tokens, document.getText());

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states).toEqual(new Set(["idle", "active"]));
      expect(mockLogger.state).toHaveBeenCalledWith(
        "Starting state tracking for document",
        { uri: document.uri }
      );
    });

    it("should handle documents with no states", () => {
      const document = TextDocument.create(
        "test.xml",
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

      stateTracker.trackStates(document, tokens, document.getText());

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states.size).toBe(0);
    });

    it("should update states when document changes", () => {
      const document1 = TextDocument.create(
        "test.xml",
        "aiml",
        1,
        '<state id="idle"/>'
      );

      const tokens1: Token[] = [
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
      ];

      stateTracker.trackStates(document1, tokens1, document1.getText());
      expect(stateTracker.getStatesForDocument(document1.uri)).toEqual(
        new Set(["idle"])
      );

      const document2 = TextDocument.create(
        document1.uri,
        "aiml",
        2,
        '<state id="active"/>'
      );

      const tokens2: Token[] = [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        { type: TokenType.AttributeName, startIndex: 7, endIndex: 9, index: 2 },
        { type: TokenType.Equal, startIndex: 9, endIndex: 10, index: 3 },
        { type: TokenType.String, startIndex: 10, endIndex: 18, index: 4 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 18,
          endIndex: 20,
          index: 5,
        },
      ];

      stateTracker.trackStates(document2, tokens2, document2.getText());
      expect(stateTracker.getStatesForDocument(document2.uri)).toEqual(
        new Set(["active"])
      );
    });
  });

  describe("clearStates", () => {
    it("should remove states for the specified document", () => {
      const document = TextDocument.create(
        "test.xml",
        "aiml",
        1,
        '<state id="idle"/>'
      );

      const tokens: Token[] = [
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
      ];

      stateTracker.trackStates(document, tokens, document.getText());
      expect(stateTracker.getStatesForDocument(document.uri).size).toBe(1);

      stateTracker.clearStates(document.uri);
      expect(stateTracker.getStatesForDocument(document.uri).size).toBe(0);
      expect(mockLogger.state).toHaveBeenCalledWith(
        "Cleared states for document",
        { uri: document.uri }
      );
    });
  });

  describe("getStatesForDocument", () => {
    it("should return empty set for unknown document", () => {
      const states = stateTracker.getStatesForDocument("unknown.xml");
      expect(states).toEqual(new Set());
    });

    it("should return tracked states for known document", () => {
      const document = TextDocument.create(
        "test.xml",
        "aiml",
        1,
        '<state id="idle"/><state id="active"/>'
      );

      const tokens: Token[] = [
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
        { type: TokenType.StartTag, startIndex: 18, endIndex: 19, index: 6 },
        { type: TokenType.TagName, startIndex: 19, endIndex: 24, index: 7 },
        {
          type: TokenType.AttributeName,
          startIndex: 25,
          endIndex: 27,
          index: 8,
        },
        { type: TokenType.Equal, startIndex: 27, endIndex: 28, index: 9 },
        { type: TokenType.String, startIndex: 28, endIndex: 36, index: 10 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 36,
          endIndex: 38,
          index: 11,
        },
      ];

      stateTracker.trackStates(document, tokens, document.getText());
      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states).toEqual(new Set(["idle", "active"]));
    });
  });
});
