import { beforeEach, describe, expect, it } from "bun:test";
import type { ActionContext } from "@mastra/core";
import { z } from "zod";
import { StepValue } from "../../StepValue";
import { BaseElement } from "../BaseElement";
import { Parallel } from "./ParallelElement";
import { State } from "./StateElement";
import { MockMastraContext } from "../../utils/MockMastraContext";

const parallelSchema = z.object({
  id: z.string().optional(),
});

type ParallelProps = z.infer<typeof parallelSchema>;

describe.skip("ParallelElement", () => {
  let ctx: ActionContext<any>;
  let root: BaseElement;

  beforeEach(() => {
    root = new BaseElement({
      id: "root",
      tag: "workflow",
      type: "state",
      subType: "user-input",
      scope: ["root"],
      key: "root",
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
      allowedChildren: "any",
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

    expect(element.subType).toBe("parallel");
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
});
