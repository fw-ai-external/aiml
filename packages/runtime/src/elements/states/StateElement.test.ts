import { beforeEach, describe, expect, it } from "bun:test";
import type { ActionContext } from "@mastra/core";
import { z } from "zod";
import { StepValue } from "../../StepValue";
import { BaseElement } from "../BaseElement";
import { MockMastraContext } from "../../utils/MockMastraContext";
import { State } from "./StateElement";
import { ScopedDataModelRegistry } from "../../DataModelRegistry";
import { DataModelRegistry } from "../../DataModelRegistry";

const stateSchema = z.object({
  id: z.string().optional(),
  initial: z.string().optional(),
});

type StateProps = z.infer<typeof stateSchema>;

describe("StateElement", () => {
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
      datamodel: new ScopedDataModelRegistry(new DataModelRegistry(), "root"),
      requestInput: {
        userMessage: "hi",
        chatHistory: [],
        systemMessage: "you are a helpful assistant",
        clientSideTools: [],
        secrets: {
          system: {},
          user: {},
        },
      },
      machine: {
        id: "test",
        secrets: {
          system: {
            OPENAI_API_KEY: "test-key",
          },
        },
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
      new WeakRef(root)
    );

    expect((element as BaseElement).type).toBe("state");
    expect((element as BaseElement).attributes.initial).toBe("substate1");
  });

  it.skip("should execute and return state info", async () => {
    const element = State.initFromAttributesAndNodes(
      {
        id: "state1",
      },
      [],
      new WeakRef(root)
    );

    const result = await (element as BaseElement).execute?.(ctx as any);
    const value = await result?.result?.value();
    // @ts-expect-error
    expect(value).toEqual({
      object: { id: "state1", isActive: true },
    });
  });

  it.skip("should handle child states", async () => {
    const childState = State.initFromAttributesAndNodes(
      {
        id: "child1",
      },
      [],
      new WeakRef(root)
    );

    const element = State.initFromAttributesAndNodes(
      {
        id: "state1",
        initial: "child1",
      },
      [childState as any],
      new WeakRef(root)
    );

    const result = await (element as BaseElement).execute?.(ctx as any);
    const value = await result?.result?.value();
    // @ts-expect-error
    expect(value).toEqual({
      object: { id: "state1", isActive: true },
    });
  });
});
