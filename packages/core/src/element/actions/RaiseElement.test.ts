import { describe, expect, it, beforeEach, mock } from "bun:test";
import { BaseElement } from "../../runtime/BaseElement";
import { Raise } from "./RaiseElement";
import { StepValue } from "../../runtime/StepValue";

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
      onExecutionGraphConstruction: (buildContext) => ({
        id: "root",
        key: "root-key",
        type: "state",
        subType: "scxml",
        attributes: {},
      }),
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
      [root]
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
      [root]
    ) as BaseElement;

    const executeResult = await element.execute?.(ctx);
    const value = await executeResult?.value();
    expect(value).toEqual({
      type: "object",
      object: { event: "test.event" },
      raw: JSON.stringify({ event: "test.event" }),
      wasHealed: false,
    });
    expect(mockSendEvent).toHaveBeenCalledWith("test.event");
  });

  it.skip("should throw error if event attribute is missing", async () => {
    const element = Raise.initFromAttributesAndNodes(
      {
        id: "raise1",
      } as any,
      [],
      [root]
    ) as BaseElement;

    await expect(element.execute?.(ctx)).rejects.toThrow(
      "Raise element requires an 'event' attribute"
    );
  });
});
