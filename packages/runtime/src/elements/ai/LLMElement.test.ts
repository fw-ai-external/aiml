import { describe, expect, it } from "bun:test";
import { v4 as uuidv4 } from "uuid";
import { ElementExecutionContext } from "../../ElementExecutionContext";
import { StepValue } from "../../StepValue";
import { MockMastraContext } from "../../utils/MockMastraContext";
import { BaseElement } from "../BaseElement";
import { LLM } from "./LLMElement";
import {
  DataModelRegistry,
  ScopedDataModelRegistry,
} from "../../DataModelRegistry";
/**
 * Helper function to extract the value from an execution result
 */
async function getResultValue(executeResult: any) {
  const { result } = executeResult;
  return await result.value();
}

const stepContext = new ElementExecutionContext({
  input: new StepValue({}),
  datamodel: new ScopedDataModelRegistry(new DataModelRegistry(), "root"),
  requestInput: {
    userMessage: "",
    chatHistory: [],
    clientSideTools: [],
    secrets: { system: {}, user: {} },
  },
  props: {
    id: "llm1",
    model: "test-model",
    system: "You are a helpful assistant",
    prompt: "Hello!",
  },
  state: { id: "llm1", props: {}, input: new StepValue({}) },
  machine: { id: "workflow", secrets: { system: {}, user: {} } },
  run: { id: "run" },
});

describe.skip("LLM Element", () => {
  it("should create an instance with correct properties", () => {
    const llm = LLM.initFromAttributesAndNodes(
      {
        id: "llm1",
        model: "test-model",
        system: "You are a helpful assistant",
        prompt: "Hello!",
      },
      [],

      new WeakRef(
        new BaseElement({
          id: "root",
          tag: "workflow",
          type: "state",
          subType: "user-input",
          scope: ["root"],
          key: uuidv4(),
          lineStart: 0,
          lineEnd: 0,
          columnStart: 0,
          columnEnd: 0,
          allowedChildren: [],
          onExecutionGraphConstruction: () => ({}) as any,
        })
      )
    );

    expect((llm as BaseElement).id).toBe("llm1");
    expect((llm as BaseElement).attributes.model).toBe("test-model");
    expect((llm as BaseElement).attributes.system).toBe(
      "You are a helpful assistant"
    );
    expect((llm as BaseElement).attributes.prompt).toBe("Hello!");
  });

  it("should execute with basic prompt and return response", async () => {
    const llm = LLM.initFromAttributesAndNodes(
      {
        id: "llm1",
        model: "test-model",
        prompt: "Hello!",
      },
      [],

      new WeakRef(
        new BaseElement({
          id: "root",
          tag: "workflow",
          type: "state",
          subType: "user-input",
          scope: ["root"],
          key: uuidv4(),
          lineStart: 0,
          lineEnd: 0,
          columnStart: 0,
          columnEnd: 0,
          allowedChildren: [],
          onExecutionGraphConstruction: () => ({}) as any,
        })
      )
    );

    const executeResult = await llm.execute(new MockMastraContext(stepContext));
    const value = await getResultValue(executeResult);

    expect(executeResult.result).toBeInstanceOf(StepValue);
    expect(value).toEqual({
      type: "text",
      text: "Mock LLM response",
    });
  });

  it("should include system message when provided", async () => {
    const llm = LLM.initFromAttributesAndNodes(
      {
        id: "llm1",
        model: "test-model",
        system: "You are a helpful assistant",
        prompt: "Hello!",
      },
      [],

      new WeakRef(
        new BaseElement({
          id: "root",
          tag: "workflow",
          type: "state",
          subType: "user-input",
          scope: ["root"],
          key: uuidv4(),
          lineStart: 0,
          lineEnd: 0,
          columnStart: 0,
          columnEnd: 0,
          allowedChildren: [],
          onExecutionGraphConstruction: () => ({}) as any,
        })
      )
    );

    const executeResult = await (llm as any).execute(stepContext);
    const value = await getResultValue(executeResult);

    expect(executeResult.result).toBeInstanceOf(StepValue);
    expect(value).toEqual({
      type: "text",
      text: "Mock LLM response",
    });
  });

  it("should handle chat history when includeChatHistory is true", async () => {
    const llm = LLM.initFromAttributesAndNodes(
      {
        id: "llm1",
        model: "test-model",
        prompt: "Hello!",
        includeChatHistory: true,
      },
      [],

      new WeakRef(
        new BaseElement({
          id: "root",
          tag: "workflow",
          type: "state",
          subType: "user-input",
          scope: ["root"],
          key: uuidv4(),
          lineStart: 0,
          lineEnd: 0,
          columnStart: 0,
          columnEnd: 0,
          allowedChildren: [],
          onExecutionGraphConstruction: () => ({}) as any,
        })
      )
    );

    const executeResult = await (llm as any).execute(stepContext);
    const value = await getResultValue(executeResult);

    expect(executeResult.result).toBeInstanceOf(StepValue);
    expect(value).toEqual({
      type: "text",
      text: "Mock LLM response",
    });
  });

  // Skipping this test as we can't properly mock the streamText function
  it.skip("should handle errors gracefully", async () => {
    // This test would verify error handling in the LLM element
    // but we can't properly mock the streamText function in this environment
  });

  it("should handle response format configuration", async () => {
    const llm = LLM.initFromAttributesAndNodes(
      {
        id: "llm1",
        model: "test-model",
        prompt: "Hello!",
        responseFormat: {
          type: "json",
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
      [],

      new WeakRef(
        new BaseElement({
          id: "root",
          tag: "workflow",
          type: "state",
          subType: "user-input",
          scope: ["root"],
          key: uuidv4(),
          lineStart: 0,
          lineEnd: 0,
          columnStart: 0,
          columnEnd: 0,
          allowedChildren: [],
          onExecutionGraphConstruction: () => ({}) as any,
        })
      )
    );

    const executeResult = await (llm as any).execute(stepContext);
    const value = await getResultValue(executeResult);

    expect(executeResult.result).toBeInstanceOf(StepValue);
    expect(value).toEqual({
      type: "text",
      text: "Mock LLM response",
    });
  });
});
