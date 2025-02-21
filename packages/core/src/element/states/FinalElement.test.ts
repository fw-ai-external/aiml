import { describe, expect, it, beforeEach } from "bun:test";
import { Final } from "./FinalElement";
import { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { z } from "zod";
import { StepValue } from "../../runtime/StepValue";
import { BaseElement } from "../../runtime/BaseElement";

const finalSchema = z.object({
  id: z.string().optional(),
});

type FinalProps = z.infer<typeof finalSchema>;

describe("FinalElement", () => {
  let ctx: ElementExecutionContext<FinalProps>;
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
      input: new StepValue({
        type: "text",
        text: "test",
      }),
      datamodel: {},
      workflowInput: {
        userMessage: "",
        chatHistory: [],
        clientSideTools: [],
      },
      attributes: {},
      state: {
        id: "test",
        attributes: {},
        input: new StepValue({
          type: "text",
          text: "test",
        }),
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
    const element = Final.initFromAttributesAndNodes(
      {
        id: "final1",
      },
      [],
      [root]
    );

    expect((element as BaseElement).elementType).toBe("final");
  });

  it("should execute and handle onentry elements", async () => {
    const onEntry = Final.initFromAttributesAndNodes(
      {
        id: "entry1",
      },
      [],
      [root]
    );

    const element = Final.initFromAttributesAndNodes(
      {
        id: "final1",
      },
      [onEntry as BaseElement],
      [root]
    );

    const result = await (element as BaseElement).execute(ctx as any);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { id: "final1", isActive: true },
      raw: JSON.stringify({ id: "final1", isActive: true }),
    });
  });

  it("should execute with parent state", async () => {
    const parent = Final.initFromAttributesAndNodes(
      {
        id: "parent",
      },
      [],
      [root]
    );

    const element = Final.initFromAttributesAndNodes(
      {
        id: "final1",
      },
      [],
      [parent as BaseElement]
    );

    const result = await (element as BaseElement).execute(ctx as any);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { id: "final1", isActive: true },
      raw: JSON.stringify({ id: "final1", isActive: true }),
    });
  });
});
