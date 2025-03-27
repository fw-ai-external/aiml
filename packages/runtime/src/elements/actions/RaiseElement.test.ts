import { beforeEach, describe, expect, it, mock } from "bun:test";
import { z } from "zod";
import { StepValue } from "../../StepValue";
import { BaseElement } from "../BaseElement";
import { Raise } from "./RaiseElement";

describe("RaiseElement", () => {
  let ctx: any;
  let root: BaseElement;
  let mockSendEvent: ReturnType<typeof mock>;

  beforeEach(() => {
    root = new BaseElement({
      id: "root",
      elementType: "scxml",
      tag: "scxml",
      role: "state",
      key: "root-key",
      attributes: {},
      children: [],
      type: "element",
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
      onExecutionGraphConstruction: () => ({
        id: "root",
        key: "root-key",
        type: "state",
        tag: "scxml",
        attributes: {},
        scope: ["root"],
      }),
      allowedChildren: "any",
      schema: z.object({}),
    });

    mockSendEvent = mock((event: string) => {});

    // Create a minimal mock context that matches what RaiseElement expects
    ctx = {
      input: new StepValue({ type: "text", text: "" }),
      attributes: {
        event: "test.event",
      },
      datamodel: {},
      sendEvent: mockSendEvent,
    };
  });

  it.skip("should create instance with correct properties", () => {
    const element = Raise.initFromAttributesAndNodes(
      {
        id: "raise1",
        event: "test.event",
      },
      [],
      new WeakRef(root)
    ) as BaseElement;

    expect(element.elementType).toBe("raise");
    expect(element.attributes.event).toBe("test.event");
  });

  it.skip("should raise event", async () => {
    const element = Raise.initFromAttributesAndNodes(
      {
        id: "raise1",
        event: "test.event",
      },
      [],
      new WeakRef(root)
    ) as BaseElement;

    const executeResult = await element.execute?.(ctx);
    const value = await executeResult?.result?.value();
    // @ts-expect-error
    expect(value).toEqual({
      object: { event: "test.event" },
    });
    expect(mockSendEvent).toHaveBeenCalledWith("test.event");
  });

  it.skip("should throw error if event attribute is missing", async () => {
    const element = Raise.initFromAttributesAndNodes(
      {
        id: "raise1",
      } as any,
      [],
      new WeakRef(root)
    ) as BaseElement;

    await expect(element.execute?.(ctx)).rejects.toThrow(
      "Raise element requires an 'event' attribute"
    );
  });
});
