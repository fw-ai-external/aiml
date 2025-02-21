import { describe, expect, it } from "bun:test";
import { SCXML } from "./SCXMLElement";
import { StepValue } from "../../runtime/StepValue";
import { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { BaseElement } from "../../runtime/BaseElement";

describe("SCXMLElement", () => {
  const createMockContext = (attributes = {}) => {
    return new ElementExecutionContext({
      input: new StepValue({
        type: "object",
        object: {},
        raw: "{}",
        id: "test",
        _stats: {},
        _inputValue: null,
      }),
      workflowInput: {
        userMessage: "hi",
        chatHistory: [],
        systemMessage: "you are a helpful assistant",
        clientSideTools: [],
      },
      state: {
        id: "test",
        attributes: {},
        input: new StepValue({ type: "text", text: "" }),
      },
      attributes,
      datamodel: {},
      machine: { id: "test", secrets: { system: {} } },
      run: { id: "test" },
    });
  };

  class MockState extends BaseElement {
    constructor(id: string) {
      super({
        id,
        tag: "state",
        role: "state",
        key: id,
        elementType: "state",
        attributes: { id },
        execute: async (ctx) => {
          ctx.datamodel[`_state_${id}`] = { isActive: true };
          return new StepValue({
            type: "object",
            object: { id },
            raw: JSON.stringify({ id }),
            id: ctx.state.id,
            _stats: {},
            _inputValue: null,
          });
        },
      });
    }
  }

  const mockSCXML = {
    tag: "scxml",
    execute: (SCXML as any).definition.execute,
  };

  it("should create an SCXML element", () => {
    expect(mockSCXML.tag).toBe("scxml");
  });

  it("should execute initial state when specified", async () => {
    const ctx = createMockContext({ initial: "s1" });
    const state1 = new MockState("s1");
    const state2 = new MockState("s2");

    const result = await mockSCXML.execute(ctx, [state1, state2]);

    expect(ctx.datamodel._state_s1).toEqual({ isActive: true });
    expect(ctx.datamodel._state_s2).toBeUndefined();
    expect(result?.object).toEqual({
      name: undefined,
      version: undefined,
      datamodel: "ecmascript",
    });
  });

  it("should execute first state when no initial state specified", async () => {
    const ctx = createMockContext({});
    const state1 = new MockState("s1");
    const state2 = new MockState("s2");

    const result = await mockSCXML.execute(ctx, [state1, state2]);

    expect(ctx.datamodel._state_s1).toEqual({ isActive: true });
    expect(ctx.datamodel._state_s2).toBeUndefined();
    expect(result?.object).toEqual({
      name: undefined,
      version: undefined,
      datamodel: "ecmascript",
    });
  });

  it("should throw error when initial state not found", async () => {
    const ctx = createMockContext({ initial: "nonexistent" });
    const state1 = new MockState("s1");

    await expect(mockSCXML.execute(ctx, [state1])).rejects.toThrow(
      'Initial state "nonexistent" not found'
    );
  });

  it("should handle optional attributes", async () => {
    const ctx = createMockContext({
      name: "test-machine",
      version: "1.0",
      datamodel: "minimal",
    });
    const state1 = new MockState("s1");

    const result = await mockSCXML.execute(ctx, [state1]);

    expect(result?.object).toEqual({
      name: "test-machine",
      version: "1.0",
      datamodel: "minimal",
    });
  });
});
