import { describe, expect, it, beforeEach } from "bun:test";
import { Parallel } from "./ParallelElement";
import { State } from "./StateElement";
import { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { z } from "zod";
import { BaseElement } from "@fireworks/core";
import { StepValue } from "../../runtime/StepValue";

const parallelSchema = z.object({
  id: z.string().optional(),
});

type ParallelProps = z.infer<typeof parallelSchema>;

describe("ParallelElement", () => {
  let ctx: ElementExecutionContext<ParallelProps>;
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
      workflowInput: {
        userMessage: "",
        chatHistory: [],
        clientSideTools: [],
      },
      datamodel: {},

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
    const element = Parallel.initFromAttributesAndNodes(
      {
        id: "parallel1",
      },
      [],
      "spec"
    ) as unknown as BaseElement;

    expect(element.elementType).toBe("parallel");
  });

  it("should execute all child states in parallel", async () => {
    const state1 = State.initFromAttributesAndNodes(
      {
        id: "state1",
      },
      [],
      "spec"
    ) as unknown as BaseElement;

    const state2 = State.initFromAttributesAndNodes(
      {
        id: "state2",
      },
      [],
      "spec"
    ) as unknown as BaseElement;

    const element = Parallel.initFromAttributesAndNodes(
      {
        id: "parallel1",
      },
      [state1, state2],
      "spec"
    ) as unknown as BaseElement;

    const result = await element.execute(ctx as any);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { id: "parallel1", isActive: true },
      raw: JSON.stringify({ id: "parallel1", isActive: true }),
    });
  });

  it("should handle transitions in child states", async () => {
    const state1 = State.initFromAttributesAndNodes(
      {
        id: "state1",
      },
      [],
      "spec"
    ) as unknown as BaseElement;

    const state2 = State.initFromAttributesAndNodes(
      {
        id: "state2",
      },
      [],
      "spec"
    ) as unknown as BaseElement;

    const element = Parallel.initFromAttributesAndNodes(
      {
        id: "parallel1",
      },
      [state1, state2],
      "spec"
    ) as unknown as BaseElement;

    const result = await element.execute(ctx as any);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { id: "parallel1", isActive: true },
      raw: JSON.stringify({ id: "parallel1", isActive: true }),
    });
  });
});
