import { describe, expect, it, beforeEach } from "bun:test";
import { Script } from "./ScriptElement";
import { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";
import { z } from "zod";
import { BaseElement } from "../BaseElement";

const scriptSchema = z.object({
  id: z.string().optional(),
  src: z.string().optional(),
  content: z.string().optional(),
});

type ScriptProps = z.infer<typeof scriptSchema>;

describe("ScriptElement", () => {
  let ctx: StepContext<ScriptProps>;
  let root: BaseElement;

  beforeEach(() => {
    root = new BaseElement({
      id: "root",
      elementType: "scxml",
      tag: "scxml",
    });

    ctx = new StepContext({
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
        },
      },
      run: {
        id: "test",
      },
    });
  });

  it("should create instance with correct properties", () => {
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
        content: "count = count + 1;",
      },
      [],
      [root]
    );

    expect((element as BaseElement).elementType).toBe("script");
    expect((element as BaseElement).attributes.content).toBe(
      "count = count + 1;"
    );
  });

  it("should execute script content", async () => {
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
        content: "count = count + 1;",
      },
      [],
      [root]
    );

    await (element as BaseElement).execute?.(ctx as any);
    expect(ctx.datamodel.count).toBe(43);
  });

  it("should execute script in context", async () => {
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
        content: "count = count * 2;",
      },
      [],
      [root]
    );

    await (element as BaseElement).execute?.(ctx as any);
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

    const result = await (element as BaseElement).execute?.(ctx as any);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { src: "https://example.com/script.js" },
      raw: JSON.stringify({ src: "https://example.com/script.js" }),
    });
    expect(ctx.datamodel.count).toBe(42);
  });

  it("should throw error if neither src nor content is provided", async () => {
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
      } as any,
      [],
      [root]
    );

    await expect(
      (element as BaseElement).execute?.(ctx as any)
    ).rejects.toThrow("Script element requires either 'src' or inline content");
  });

  it("should execute script with access to data model", async () => {
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
        content: "ctx.datamodel.count = ctx.datamodel.count + 1;",
      },
      [],
      [root]
    );

    await (element as BaseElement).execute?.(ctx as any);
    expect(ctx.datamodel.count).toBe(42);
  });

  it("should handle script execution errors", async () => {
    const element = Script.initFromAttributesAndNodes(
      {
        id: "script1",
        content: "invalidFunction();",
      },
      [],
      [root]
    );

    await expect(
      (element as BaseElement).execute?.(ctx as any)
    ).rejects.toThrow();
  });
});
