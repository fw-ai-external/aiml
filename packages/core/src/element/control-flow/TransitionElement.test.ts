import { describe, expect, it, beforeEach } from "bun:test";
import { Transition } from "./TransitionElement";
import { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { z } from "zod";
import { BaseElement } from "../../runtime/BaseElement";
import { StepValue } from "../../runtime/StepValue";
import { v4 as uuidv4 } from "uuid";

const transitionSchema = z.object({
  id: z.string().optional(),
  event: z.string().optional(),
  cond: z.string().optional(),
  target: z.string().optional(),
});

type TransitionProps = z.infer<typeof transitionSchema>;

describe("TransitionElement", () => {
  let ctx: ElementExecutionContext<TransitionProps>;
  let root: BaseElement;

  beforeEach(() => {
    root = new BaseElement({
      id: "root",
      elementType: "scxml",
      tag: "scxml",
      role: "state",
      key: uuidv4(),
      type: "element",
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
    });

    ctx = new ElementExecutionContext({
      input: new StepValue({ type: "text", text: "" }),
      datamodel: {
        count: 42,
      },
      workflowInput: {
        userMessage: "",
        chatHistory: [],
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
    const element = Transition.initFromAttributesAndNodes(
      {
        id: "transition1",
        event: "next",
        cond: "count > 0",
        target: "state2",
      },
      [],
      [new WeakRef(root)]
    );

    expect((element as BaseElement).elementType).toBe("transition");
    expect((element as BaseElement).attributes.event).toBe("next");
    expect((element as BaseElement).attributes.cond).toBe("count > 0");
    expect((element as BaseElement).attributes.target).toBe("state2");
  });

  it("should execute transition with matching event", async () => {
    const element = Transition.initFromAttributesAndNodes(
      {
        id: "transition1",
        event: "next",
        target: "state2",
      },
      [],
      [new WeakRef(root)]
    );

    const result = await (element as BaseElement).execute(ctx);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { event: "next", target: "state2", conditionMet: true },
      raw: JSON.stringify({
        event: "next",
        target: "state2",
        conditionMet: true,
      }),
      wasHealed: false,
    });
  });

  it("should evaluate condition", async () => {
    const element = Transition.initFromAttributesAndNodes(
      {
        id: "transition1",
        event: "next",
        cond: "count > 40",
        target: "state2",
      },
      [],
      [new WeakRef(root)]
    );

    const result = await (element as BaseElement).execute(ctx);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { event: "next", target: "state2", conditionMet: true },
      raw: JSON.stringify({
        event: "next",
        target: "state2",
        conditionMet: true,
      }),
      wasHealed: false,
    });
  });

  it("should not transition if condition is false", async () => {
    const element = Transition.initFromAttributesAndNodes(
      {
        id: "transition1",
        event: "next",
        cond: "count < 0",
        target: "state2",
      },
      [],
      [new WeakRef(root)]
    );

    const result = await (element as BaseElement).execute(ctx);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { event: "next", target: "state2", conditionMet: false },
      raw: JSON.stringify({
        event: "next",
        target: "state2",
        conditionMet: false,
      }),
      wasHealed: false,
    });
  });
});
