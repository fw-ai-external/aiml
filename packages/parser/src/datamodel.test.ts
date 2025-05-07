import { describe, it, expect } from "bun:test";
import { parse } from "./index.js";

describe("parser datamodel tests", () => {
  it("should return empty datamodel for empty input", async () => {
    const result = await parse("");
    expect(result.datamodel).toEqual({});
  });

  it.skip("should extract simple datamodel with root scope", async () => {
    const mdx = `
# Data Model
<data id="user" type="string">John Doe</data>
<data id="age" type="number">30</data>
    `;
    const result = await parse(mdx);

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

  it.skip("should handle nested data elements with dot notation scoping", async () => {
    const mdx = `
<state id="auth">
  <data id="token" type="string">abc123</data>
  <state id="user">
    <data id="name" type="string">Alice</data>
  </state>
</state>
    `;
    const result = await parse(mdx);

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

  it.skip("should handle nested datamodel elements with dot notation scoping", async () => {
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
    const result = await parse(mdx);

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

  it.skip("should handle error cases with empty datamodel", async () => {
    // Invalid MDX that will cause parse error
    const mdx = "<invalid>content";
    const result = await parse(mdx);

    // Instead of checking exact AST structure, verify key properties
    expect(result.nodes).toHaveLength(1);
    const workflow = result.nodes[0];
    // expect(workflow.type).toBe("element");
    expect(workflow.tag).toBe("workflow");
    expect(workflow.attributes?.id).toBe("workflow-root");

    // Check that we have final and error states
    const finalState = workflow.children?.find(
      (child) => child.tag === "final"
    );
    expect(finalState).toBeDefined();
    expect(finalState?.attributes?.id).toBe("final");

    const errorState = workflow.children?.find(
      (child) => child.attributes?.id === "error"
    );
    expect(errorState).toBeDefined();
    expect(errorState?.tag).toBe("state");
    expect(result.diagnostics.length).toEqual(1);
    expect(result.datamodel).toEqual({});
  });
});
