import { describe, expect, it, beforeEach } from "bun:test";
import { Final } from "./FinalElement";
import { z } from "zod";
import { StepValue } from "@fireworks/shared";
import { BaseElement } from "@fireworks/shared";
import { SerializedBaseElement } from "@fireworks/types";
import { MockElementExecutionContext } from "../utils/mock-execution-context";
import { ElementExecutionContext } from "../utils/ElementExecutionContext";

const finalSchema = z.object({
  id: z.string().optional(),
});

type FinalProps = z.infer<typeof finalSchema>;

describe("FinalElement", () => {
  let ctx: ElementExecutionContext<any>;
  let root: BaseElement;

  beforeEach(() => {
    root = new BaseElement({
      id: "root",
      elementType: "scxml",
      tag: "scxml",
      role: "state",
      key: "root",
      type: "element",
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
      allowedChildren: "any",
      schema: z.object({}),
      onExecutionGraphConstruction: () => ({}) as any,
    });

    ctx = new MockElementExecutionContext({
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
    }) as any;
  });

  it("should create instance with correct properties", () => {
    const element = Final.initFromAttributesAndNodes(
      {
        id: "final1",
      },
      [],
      new WeakRef(root)
    );

    expect((element as BaseElement).elementType).toBe("final");
  });

  it("should execute and handle onentry elements", async () => {
    const onEntry = Final.initFromAttributesAndNodes(
      {
        id: "entry1",
      },
      [],
      new WeakRef(root)
    );

    const element = Final.initFromAttributesAndNodes(
      {
        id: "final1",
      },
      [onEntry as SerializedBaseElement],
      new WeakRef(root)
    );

    const result = await (element as BaseElement).execute(ctx as any);
    const value = await result?.result?.value();
    expect(value).toEqual({
      type: "object",
      object: {
        id: "final1",
        isActive: true,
      },
      raw: JSON.stringify({
        id: "final1",
        isActive: true,
      }),
    });
  });

  it("should execute with parent state", async () => {
    const parent = Final.initFromAttributesAndNodes(
      {
        id: "parent",
      },
      [],
      new WeakRef(root)
    );

    const element = Final.initFromAttributesAndNodes(
      {
        id: "final1",
      },
      [],
      new WeakRef(parent as BaseElement)
    );

    const result = await (element as BaseElement).execute(ctx as any);
    const value = await result?.result?.value();
    expect(value).toEqual({
      type: "object",
      object: {
        id: "final1",
        isActive: true,
      },
      raw: JSON.stringify({
        id: "final1",
        isActive: true,
      }),
    });
  });
});
