import { describe, expect, it, beforeEach } from "bun:test";
import { State } from "./StateElement";
import { z } from "zod";
import { StepValue } from "../../runtime/StepValue";
import { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { BaseElement } from "../";

const stateSchema = z.object({
  id: z.string().optional(),
  initial: z.string().optional(),
});

type StateProps = z.infer<typeof stateSchema>;

describe("StateElement", () => {
  let ctx: ElementExecutionContext<StateProps>;
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
    });

    ctx = new ElementExecutionContext({
      input: new StepValue({ type: "text", text: "" }),
      datamodel: {},
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
          system: {
            OPENAI_API_KEY: "test-key",
          },
        },
      },
      run: {
        id: "test",
      },
    });
  });

  it("should create instance with correct properties", () => {
    const element = State.initFromAttributesAndNodes(
      {
        id: "state1",
        initial: "substate1",
      },
      [],
      [new WeakRef(root)]
    );

    expect((element as BaseElement).elementType).toBe("state");
    expect((element as BaseElement).attributes.initial).toBe("substate1");
  });

  it("should execute and return state info", async () => {
    const element = State.initFromAttributesAndNodes(
      {
        id: "state1",
      },
      [],
      [new WeakRef(root)]
    );

    const result = await (element as BaseElement).execute?.(ctx as any);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { id: "state1", isActive: true },
      raw: JSON.stringify({ id: "state1", isActive: true }),
      wasHealed: false,
    });
  });

  it("should handle child states", async () => {
    const childState = State.initFromAttributesAndNodes(
      {
        id: "child1",
      },
      [],
      [new WeakRef(root)]
    );

    const element = State.initFromAttributesAndNodes(
      {
        id: "state1",
        initial: "child1",
      },
      [childState as any],
      [new WeakRef(root)]
    );

    const result = await (element as BaseElement).execute?.(ctx as any);
    const value = await result?.value();
    expect(value).toEqual({
      type: "object",
      object: { id: "state1", isActive: true },
      raw: JSON.stringify({ id: "state1", isActive: true }),
      wasHealed: false,
    });
  });
});
