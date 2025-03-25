import { describe, it, expect } from "bun:test";
import { parseMDXToAIML } from "./index.js";

describe("parser datamodel tests", () => {
  it("should return empty datamodel for empty input", async () => {
    const result = await parseMDXToAIML("");
    expect(result.datamodel).toEqual({});
  });

  it("should extract simple datamodel with root scope", async () => {
    const mdx = `
# Data Model
<data id="user" type="string">John Doe</data>
<data id="age" type="number">30</data>
    `;
    const result = await parseMDXToAIML(mdx);

    expect(result.datamodel).toEqual({
      root: {
        user: {
          type: "string",
          readonly: false,
          fromRequest: false,
          schema: {
            type: "string",
          },
          defaultValue: "John Doe",
        },
        age: {
          type: "number",
          readonly: false,
          fromRequest: false,
          schema: {
            type: "number",
          },
          defaultValue: 30,
        },
      },
    });
  });

  it("should handle nested data elements with dot notation scoping", async () => {
    const mdx = `
<state id="auth">
  <data id="token" type="string">abc123</data>
  <state id="user">
    <data id="name" type="string">Alice</data>
  </state>
</state>
    `;
    const result = await parseMDXToAIML(mdx);

    expect(result.datamodel).toEqual({
      "root.auth": {
        token: {
          type: "string",
          readonly: false,
          fromRequest: false,
          schema: {
            type: "string",
          },
          defaultValue: "abc123",
        },
      },
      "root.auth.user": {
        name: {
          type: "string",
          readonly: false,
          fromRequest: false,
          schema: {
            type: "string",
          },
          defaultValue: "Alice",
        },
      },
    });
  });

  it("should handle nested datamodel elements with dot notation scoping", async () => {
    const mdx = `
<datamodel>
  <data id="token" type="string">abc123</data>
</datamodel>
<state id="auth">
  <state id="user">
    <data id="name" type="string">Alice</data>
  </state>
</state>
    `;
    const result = await parseMDXToAIML(mdx);

    expect(result.datamodel).toEqual({
      root: {
        token: {
          type: "string",
          readonly: false,
          fromRequest: false,
          schema: {
            type: "string",
          },
          defaultValue: "abc123",
        },
      },
      "root.auth.user": {
        name: {
          type: "string",
          readonly: false,
          fromRequest: false,
          schema: {
            type: "string",
          },
          defaultValue: "Alice",
        },
      },
    });
  });

  it("should handle error cases with empty datamodel", async () => {
    // Invalid MDX that will cause parse error
    const mdx = "<invalid>content";
    const result = await parseMDXToAIML(mdx);

    expect(result.nodes).toEqual([
      {
        attributes: {
          id: "workflow-root",
          initial: "root-state-0",
        },
        children: [
          {
            attributes: {
              id: "final",
            },
            children: [],
            columnEnd: 1,
            columnStart: 1,
            elementType: "final",
            key: "aiml-4",
            lineEnd: 1,
            lineStart: 1,
            parentId: undefined,
            role: "output",
            tag: "final",
            type: "element",
          },
          {
            attributes: {
              id: "root-state-0",
            },
            children: [
              {
                attributes: {
                  instructions: "<invalid>content",
                  model: "accounts/fireworks/models/llama-v3p1-8b-instruct",
                  prompt: "${input}",
                },
                children: [],
                columnEnd: 19,
                columnStart: 1,
                elementType: "llm",
                key: "aiml-5",
                lineEnd: 1,
                lineStart: 1,
                parentId: undefined,
                role: "action",
                tag: "llm",
                type: "element",
              },
              {
                attributes: {
                  target: "final",
                },
                children: [],
                columnEnd: 19,
                columnStart: 1,
                elementType: "transition",
                key: "aiml-8",
                lineEnd: 1,
                lineStart: 1,
                parentId: "root-state-0",
                role: "action",
                tag: "transition",
                type: "element",
              },
            ],
            columnEnd: 19,
            columnStart: 1,
            elementType: "state",
            key: "aiml-6",
            lineEnd: 1,
            lineStart: 1,
            parentId: undefined,
            role: "state",
            tag: "state",
            type: "element",
          },
          {
            attributes: {
              id: "error",
            },
            children: [],
            columnEnd: 1,
            columnStart: 1,
            elementType: "state",
            key: "aiml-7",
            lineEnd: 1,
            lineStart: 1,
            parentId: "workflow-root",
            role: "state",
            tag: "state",
            type: "element",
          },
        ],
        columnEnd: 1,
        columnStart: 1,
        elementType: "workflow",
        key: "aiml-3",
        lineEnd: 1,
        lineStart: 1,
        role: "state",
        tag: "workflow",
        type: "element",
      },
    ]);
    expect(result.diagnostics.length).toEqual(2);
    expect(result.datamodel).toEqual({});
  });
});
