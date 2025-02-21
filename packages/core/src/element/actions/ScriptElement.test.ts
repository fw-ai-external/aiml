import { describe, expect, it, beforeEach } from "bun:test";
import { Script } from "./ScriptElement";
import { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { StepValue } from "../../runtime/StepValue";
import { z } from "zod";
import { BaseElement } from "../../runtime/BaseElement";

const scriptSchema = z.object({
  id: z.string().optional(),
  src: z.string().optional(),
});

type ScriptProps = z.infer<typeof scriptSchema>;

describe("ScriptElement", () => {
  let ctx: ElementExecutionContext<ScriptProps>;
  let root: BaseElement;

  beforeEach(() => {
    root = new BaseElement({
      id: "root",
      elementType: "scxml",
      tag: "scxml",
      role: "state",
      key: "root",
    });

    ctx = new ElementExecutionContext({
      input: new StepValue({ type: "text", text: "" }),
      datamodel: {
        count: 42,
      },
      workflowInput: {
        userMessage: "hi",
        chatHistory: [],
        systemMessage: "you are a helpful assistant",
        clientSideTools: [],
      },
      attributes: {},
      state: {
        id: "test",
        attributes: {},
        input: new StepValue({ type: "text", text: "" }),
      },
      machine: {
        id: "test",
        secrets: {
          system: {},
          user: {},
        },
      },
      run: {
        id: "test",
      },
    });
  });

  it("should create instance with correct properties", () => {
    const scriptContent = "count = count + 1;";
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
      },
      [scriptContent],
      [root]
    );

    expect((element as BaseElement).elementType).toBe("script");
  });

  it("should execute script content", async () => {
    const scriptContent = "count = count + 1;";
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
      },
      [scriptContent],
      [root]
    );

    await (element as BaseElement).execute?.(ctx, [scriptContent]);
    expect(ctx.datamodel.count).toBe(43);
  });

  it("should execute script in context", async () => {
    const scriptContent = "count = count * 2;";
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
      },
      [scriptContent],
      [root]
    );

    await (element as BaseElement).execute?.(ctx, [scriptContent]);
    expect(ctx.datamodel.count).toBe(84);
  });

  it("should execute external script content", async () => {
    // Mock fetch
    global.fetch = async () =>
      ({
        text: async () => "ctx.datamodel.count = 42;",
      }) as Response;

    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
        src: "https://example.com/script.js",
      },
      [],
      [root]
    );

    const result = await (element as BaseElement).execute?.(ctx, []);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { src: "https://example.com/script.js", content: undefined },
      raw: JSON.stringify({
        src: "https://example.com/script.js",
        content: undefined,
      }),
    });
    expect(ctx.datamodel.count).toBe(42);
  });

  it("should throw error if neither src nor content is provided", async () => {
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
      },
      [],
      [root]
    );

    await expect((element as BaseElement).execute?.(ctx, [])).rejects.toThrow(
      "Script element requires either 'src' or inline content"
    );
  });

  it("should execute script with access to data model", async () => {
    const scriptContent = "ctx.datamodel.count = ctx.datamodel.count + 1;";
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
      },
      [scriptContent],
      [root]
    );

    await (element as BaseElement).execute?.(ctx, [scriptContent]);
    expect(ctx.datamodel.count).toBe(42);
  });

  it("should handle script execution errors", async () => {
    const scriptContent = "invalidFunction();";
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
      },
      [scriptContent],
      [root]
    );

    await expect(
      (element as BaseElement).execute?.(ctx, [scriptContent])
    ).rejects.toThrow();
  });
});
