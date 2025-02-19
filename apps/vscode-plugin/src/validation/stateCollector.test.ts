import { describe, expect, it } from "bun:test";
import { StateCollector } from "./stateCollector";
import { parseToTokens } from "../acorn";
import { TextDocument } from "vscode-languageserver-textdocument";

describe("StateCollector", () => {
  const collector = new StateCollector();

  it("collects state IDs from document", () => {
    const content = '<><state id="idle"/></>';
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: parseToTokens(content),
    };

    const tokens = parseToTokens(content);
    console.log("Tokens:", JSON.stringify(tokens, null, 2));
    const { stateIds } = collector.collect({ ...context, tokens });
    expect(stateIds.has("idle")).toBe(true);
  });

  it("collects multiple state IDs", () => {
    const content =
      '<><state id="idle"/><state id="active"/><state id="error"/></>';
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
    const content =
      '<><state id="idle"/><transition id="t1"/><script id="s1"/></>';
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
    const content = '<><transition target="somewhere"/></>';
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
    const content = '<><state id="test"/></>';
    const document = TextDocument.create("test.xml", "aiml", 1, content);
    const context = {
      document,
      content,
      tokens: parseToTokens(content),
    };

    const { stateIds } = collector.collect(context);
    expect(stateIds.has("test")).toBe(true);
  });
});
