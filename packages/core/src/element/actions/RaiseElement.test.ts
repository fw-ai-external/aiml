import { describe, expect, it, beforeEach } from "bun:test";
import { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";
import { z } from "zod";
import { BaseElement } from "../BaseElement";
import { Raise } from "./RaiseElement";

const raiseSchema = z.object({
  id: z.string().optional(),
  event: z.string(),
});

type RaiseProps = z.infer<typeof raiseSchema>;

describe("RaiseElement", () => {
  let ctx: StepContext<RaiseProps>;
  let root: BaseElement;

  beforeEach(() => {
    root = new BaseElement({
      id: "root",
      elementType: "scxml",
      tag: "scxml",
    });

    ctx = new StepContext({
      input: new StepValue({ type: "text", text: "" }),
      datamodel: {},
      workflowInput: {
        userMessage: "Hello, world!",
        systemMessage: "",
        chatHistory: [],
        clientSideTools: [],
      },
      attributes: {
        event: "test.event",
      },
      state: {
        id: "test",
        attributes: {},
        input: new StepValue({ type: "text", text: "" }),
      },
      machine: {
        id: "test",
        secrets: { system: {} },
      },
      run: {
        id: "test",
      },
    });
  });

  it("should create instance with correct properties", () => {
    const element = Raise.initFromAttributesAndNodes(
      {
        id: "raise1",
        event: "test.event",
      },
      [],
      [root]
    );

    expect((element as BaseElement).elementType).toBe("raise");
    expect((element as BaseElement).attributes.event).toBe("test.event");
  });

  it("should raise event", async () => {
    const element = Raise.initFromAttributesAndNodes(
      {
        id: "raise1",
        event: "test.event",
      },
      [],
      [root]
    );

    const result = await (element as BaseElement).execute?.(ctx as any);
    const value = await result?.value();
    expect(value).toEqual({
      type: "text",
      text: "Raised event: test.event",
    });
  });

  it("should throw error if event attribute is missing", async () => {
    const element = Raise.initFromAttributesAndNodes(
      {
        id: "raise1",
      } as any,
      [],
      [root]
    );

    await expect(
      (element as BaseElement).execute?.(ctx as any)
    ).rejects.toThrow("Raise element requires an 'event' attribute");
  });
});
