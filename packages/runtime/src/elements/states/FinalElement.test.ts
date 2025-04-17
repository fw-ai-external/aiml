import { beforeEach, describe, expect, it } from "bun:test";
import { StepValue } from "../../StepValue";
import { BaseElement } from "../BaseElement";
import { Final } from "./FinalElement";
import { MockMastraContext } from "../../utils/MockMastraContext";
import type { ActionContext } from "@mastra/core";

describe("FinalElement", () => {
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
      input: new StepValue({
        type: "text",
        text: "test",
      }),

      state: {
        id: "test",
        props: {},
        input: new StepValue({
          type: "text",
          text: "test",
        }),
      },
    });
  });

  it("should create instance with correct properties", () => {
    const element = Final.initFromAttributesAndNodes(
      {
        id: "final1",
      },
      [],
      new WeakRef(root)
    );

    expect((element as BaseElement).tag).toBe("final");
  });

  it.skip("should execute and handle onentry elements", async () => {
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
      [onEntry.toJSON()],
      new WeakRef(root)
    );

    const result = await (element as BaseElement).execute(ctx as any);
    const value = await result?.result?.value();
    // @ts-expect-error
    expect(value).toEqual({
      object: {
        id: "final1",
        isActive: true,
      },
    });
  });

  it.skip("should execute with parent state", async () => {
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
    // @ts-expect-error
    expect(value).toEqual({
      object: {
        id: "final1",
        isActive: true,
      },
    });
  });
});
