import { describe, expect, it } from "bun:test";
import { Workflow } from "./WorkflowElement";
import { BaseElement } from "@fireworks/shared";
import { z } from "zod";

import { MockStepValue } from "../utils/mock-step-value";
import { MockElementExecutionContext } from "../utils/mock-execution-context";

describe("WorkflowElement", () => {
  const createMockContext = (attributes = {}) => {
    return new MockElementExecutionContext({
      input: new MockStepValue({
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
        input: new MockStepValue({ type: "text", text: "" }),
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
        type: "element",
        lineStart: 0,
        lineEnd: 0,
        columnStart: 0,
        columnEnd: 0,
        allowedChildren: "any",
        schema: z.object({}),
        onExecutionGraphConstruction: () => ({}) as any,
      });
    }
  }

  const mockWorkflow = {
    tag: "workflow",
    execute: (Workflow as any).definition.execute,
  };

  it("should create an SCXML element", () => {
    expect(mockWorkflow.tag).toBe("workflow");
  });

  it("should execute initial state when specified", async () => {
    const ctx = createMockContext({ initial: "s1" });
    const state1 = new MockState("s1");
    const state2 = new MockState("s2");

    const result = await mockWorkflow.execute(ctx, [state1, state2]);

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

    const result = await mockWorkflow.execute(ctx, [state1, state2]);

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

    await expect(mockWorkflow.execute(ctx, [state1])).rejects.toThrow(
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

    const result = await mockWorkflow.execute(ctx, [state1]);

    expect(result?.object).toEqual({
      name: "test-machine",
      version: "1.0",
      datamodel: "minimal",
    });
  });
});
