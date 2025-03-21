import { describe, expect, it, beforeEach } from "bun:test";
import { Parallel } from "./ParallelElement";
import { State } from "./StateElement";
import { z } from "zod";
import { BaseElement } from "../BaseElement";
import { StepValue } from "../../StepValue";
import { MockMastraContext } from "../utils/MockMastraContext";
import { ActionContext } from "@mastra/core";

const parallelSchema = z.object({
  id: z.string().optional(),
});

type ParallelProps = z.infer<typeof parallelSchema>;

describe("ParallelElement", () => {
  let ctx: ActionContext<any>;
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

    ctx = new MockMastraContext({
      input: new StepValue({ type: "text", text: "" }),
    });
  });

  it("should create instance with correct properties", () => {
    const element = Parallel.initFromAttributesAndNodes(
      {
        id: "parallel1",
      },
      [],
      new WeakRef(root)
    ) as unknown as BaseElement;

    expect(element.elementType).toBe("parallel");
  });

  it("should execute all child states in parallel", async () => {
    const state1 = State.initFromAttributesAndNodes(
      {
        id: "state1",
      },
      [],
      new WeakRef(root)
    ) as unknown as BaseElement;

    const state2 = State.initFromAttributesAndNodes(
      {
        id: "state2",
      },
      [],
      new WeakRef(root)
    ) as unknown as BaseElement;

    const element = Parallel.initFromAttributesAndNodes(
      {
        id: "parallel1",
      },
      [state1.toJSON(), state2.toJSON()],
      new WeakRef(root)
    ) as unknown as BaseElement;

    const result = await element.execute(ctx as any);
    const value = await result?.result?.value();
    // @ts-expect-error
    expect(value).toEqual({
      object: { id: "parallel1", isActive: true },
    });
  });

  it("should handle transitions in child states", async () => {
    const state1 = State.initFromAttributesAndNodes(
      {
        id: "state1",
      },
      [],
      new WeakRef(root)
    ) as unknown as BaseElement;

    const state2 = State.initFromAttributesAndNodes(
      {
        id: "state2",
      },
      [],
      new WeakRef(root)
    ) as unknown as BaseElement;

    const element = Parallel.initFromAttributesAndNodes(
      {
        id: "parallel1",
      },
      [state1, state2],
      new WeakRef(root)
    ) as unknown as BaseElement;

    const result = await element.execute(ctx as any);
    const value = await result?.result?.value();
    // @ts-expect-error
    expect(value).toEqual({
      object: { id: "parallel1", isActive: true },
    });
  });
});
