import { describe, expect, it, beforeEach } from "bun:test";
import { DebugLogger } from "../utils/debug";
import { StateCollector } from "./stateCollector";
import { parseToTokens } from "../acorn";
import { TextDocument } from "vscode-languageserver-textdocument";

describe("StateCollector", () => {
  let collector: StateCollector;
  let mockLogger: Partial<DebugLogger>;

  beforeEach(() => {
    mockLogger = {
      info: (message: string, context?: any) => {
        console.log("[StateCollector]", message, context);
      },
      token: (token: any, message: string) => {
        console.log("[StateCollector]", message, token);
      },
      state: (message: string, context?: any) => {
        console.log("[StateCollector]", message, context);
      },
    };
    collector = new StateCollector(mockLogger as DebugLogger);
  });

  it("collects state IDs from document", () => {
    const content = `<>
      <state id="idle"/>
    </>`;
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: parseToTokens(content),
    };

    const tokens = parseToTokens(content);
    console.error("Tokens:", JSON.stringify(tokens, null, 2));
    const { stateIds } = collector.collect({ ...context, tokens });
    expect(stateIds.has("idle")).toBe(true);
  });

  it("collects multiple state IDs", () => {
    const content = `<>
      <state id="idle"/>
      <state id="active"/>
      <state id="error"/>
    </>`;
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: parseToTokens(content),
    };

    const { stateIds } = collector.collect(context);
    expect(stateIds.has("idle")).toBe(true);
    expect(stateIds.has("active")).toBe(true);
    expect(stateIds.has("error")).toBe(true);
  });

  it("ignores non-state elements with id attributes", () => {
    const content = `<>
      <state id="idle"/>
      <transition id="t1"/>
      <script id="s1"/>
    </>`;
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: parseToTokens(content),
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
    const content = `<>
      <transition target="somewhere"/>
    </>`;
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: parseToTokens(content),
    };

    const { stateIds } = collector.collect(context);
    expect(stateIds.size).toBe(0);
  });

  it("logs token details for debugging", () => {
    const content = `<>
      <state id="test"/>
    </>`;
    const tokens = parseToTokens(content);
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens,
    };
    console.error("Tokens:", JSON.stringify(tokens, null, 2));

    const { stateIds } = collector.collect(context);
    expect(stateIds.has("test")).toBe(true);
  });

  it("should validate transition target states", () => {
    const content = `<>
      <state id="idle"/>
      <state id="active"/>
      <transition target="idle"/>
      <transition target="active"/>
      <transition target="nonexistent"/>
    </>`;
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: parseToTokens(content),
    };

    const { stateIds, invalidTargets } = collector.collect(context);
    expect(stateIds.has("idle")).toBe(true);
    expect(stateIds.has("active")).toBe(true);
    expect(invalidTargets).toEqual(new Set(["nonexistent"]));
  });
});
