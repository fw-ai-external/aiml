import { describe, expect, it } from "bun:test";
import { StateCollector } from "./stateCollector";
import { TokenType } from "../acorn";
import { TextDocument } from "vscode-languageserver-textdocument";

describe("StateCollector", () => {
  const collector = new StateCollector();

  it("collects state IDs from document", () => {
    const content = '<state id="idle"/>';
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        { type: TokenType.Whitespace, startIndex: 6, endIndex: 7, index: 2 },
        { type: TokenType.AttributeName, startIndex: 7, endIndex: 9, index: 3 },
        { type: TokenType.Equal, startIndex: 9, endIndex: 10, index: 4 },
        { type: TokenType.String, startIndex: 10, endIndex: 16, index: 5 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 16,
          endIndex: 18,
          index: 6,
        },
      ],
    };

    const { stateIds } = collector.collect(context);
    expect(stateIds.has("idle")).toBe(true);
  });

  it("collects multiple state IDs", () => {
    const content = '<state id="idle"/><state id="active"/><state id="error"/>';
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        { type: TokenType.Whitespace, startIndex: 6, endIndex: 7, index: 2 },
        { type: TokenType.AttributeName, startIndex: 7, endIndex: 9, index: 3 },
        { type: TokenType.Equal, startIndex: 9, endIndex: 10, index: 4 },
        { type: TokenType.String, startIndex: 10, endIndex: 16, index: 5 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 16,
          endIndex: 18,
          index: 6,
        },
        { type: TokenType.StartTag, startIndex: 18, endIndex: 19, index: 7 },
        { type: TokenType.TagName, startIndex: 19, endIndex: 24, index: 8 },
        { type: TokenType.Whitespace, startIndex: 24, endIndex: 25, index: 9 },
        {
          type: TokenType.AttributeName,
          startIndex: 25,
          endIndex: 27,
          index: 10,
        },
        { type: TokenType.Equal, startIndex: 27, endIndex: 28, index: 11 },
        { type: TokenType.String, startIndex: 28, endIndex: 36, index: 12 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 36,
          endIndex: 38,
          index: 13,
        },
        { type: TokenType.StartTag, startIndex: 38, endIndex: 39, index: 14 },
        { type: TokenType.TagName, startIndex: 39, endIndex: 44, index: 15 },
        { type: TokenType.Whitespace, startIndex: 44, endIndex: 45, index: 16 },
        {
          type: TokenType.AttributeName,
          startIndex: 45,
          endIndex: 47,
          index: 17,
        },
        { type: TokenType.Equal, startIndex: 47, endIndex: 48, index: 18 },
        { type: TokenType.String, startIndex: 48, endIndex: 55, index: 19 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 55,
          endIndex: 57,
          index: 20,
        },
      ],
    };

    const { stateIds } = collector.collect(context);
    expect(stateIds.has("idle")).toBe(true);
    expect(stateIds.has("active")).toBe(true);
    expect(stateIds.has("error")).toBe(true);
  });

  it("ignores non-state elements with id attributes", () => {
    const content = '<state id="idle"/><transition id="t1"/><script id="s1"/>';
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        { type: TokenType.Whitespace, startIndex: 6, endIndex: 7, index: 2 },
        { type: TokenType.AttributeName, startIndex: 7, endIndex: 9, index: 3 },
        { type: TokenType.Equal, startIndex: 9, endIndex: 10, index: 4 },
        { type: TokenType.String, startIndex: 10, endIndex: 16, index: 5 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 16,
          endIndex: 18,
          index: 6,
        },
        { type: TokenType.StartTag, startIndex: 18, endIndex: 19, index: 7 },
        { type: TokenType.Name, startIndex: 19, endIndex: 29, index: 8 }, // Changed to Name
        { type: TokenType.Whitespace, startIndex: 29, endIndex: 30, index: 9 },
        {
          type: TokenType.AttributeName,
          startIndex: 30,
          endIndex: 32,
          index: 10,
        },
        { type: TokenType.Equal, startIndex: 32, endIndex: 33, index: 11 },
        { type: TokenType.String, startIndex: 33, endIndex: 37, index: 12 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 37,
          endIndex: 39,
          index: 13,
        },
        { type: TokenType.StartTag, startIndex: 39, endIndex: 40, index: 14 },
        { type: TokenType.Name, startIndex: 40, endIndex: 46, index: 15 }, // Changed to Name
        { type: TokenType.Whitespace, startIndex: 46, endIndex: 47, index: 16 },
        {
          type: TokenType.AttributeName,
          startIndex: 47,
          endIndex: 49,
          index: 17,
        },
        { type: TokenType.Equal, startIndex: 49, endIndex: 50, index: 18 },
        { type: TokenType.String, startIndex: 50, endIndex: 54, index: 19 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 54,
          endIndex: 56,
          index: 20,
        },
      ],
    };

    const { stateIds } = collector.collect(context);
    expect(stateIds.has("idle")).toBe(true);
    expect(stateIds.has("t1")).toBe(false);
    expect(stateIds.has("s1")).toBe(false);
  });

  it("handles empty document", () => {
    const content = "";
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: [],
    };

    const { stateIds } = collector.collect(context);
    expect(stateIds.size).toBe(0);
  });

  it("handles document with no state elements", () => {
    const content = '<transition target="somewhere"/>';
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.Name, startIndex: 1, endIndex: 11, index: 1 }, // Changed to Name
        { type: TokenType.Whitespace, startIndex: 11, endIndex: 12, index: 2 },
        {
          type: TokenType.AttributeName,
          startIndex: 12,
          endIndex: 18,
          index: 3,
        },
        { type: TokenType.Equal, startIndex: 18, endIndex: 19, index: 4 },
        { type: TokenType.String, startIndex: 19, endIndex: 30, index: 5 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 30,
          endIndex: 32,
          index: 6,
        },
      ],
    };

    const { stateIds } = collector.collect(context);
    expect(stateIds.size).toBe(0);
  });

  it("logs token details for debugging", () => {
    const content = '<state id="test"/>';
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: [
        { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
        { type: TokenType.Whitespace, startIndex: 6, endIndex: 7, index: 2 },
        { type: TokenType.AttributeName, startIndex: 7, endIndex: 9, index: 3 },
        { type: TokenType.Equal, startIndex: 9, endIndex: 10, index: 4 },
        { type: TokenType.String, startIndex: 10, endIndex: 16, index: 5 },
        {
          type: TokenType.SimpleEndTag,
          startIndex: 16,
          endIndex: 18,
          index: 6,
        },
      ],
    };

    const { stateIds } = collector.collect(context);
    expect(stateIds.has("test")).toBe(true);
  });
});
