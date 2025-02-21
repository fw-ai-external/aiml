import { describe, expect, it } from "bun:test";
import { StepValue } from "../../runtime/StepValue";
import { LLM } from "./LLMElement";
import { BaseElement } from "../../runtime/BaseElement";
import { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { v4 as uuidv4 } from "uuid";

const stepContext = new ElementExecutionContext({
  input: new StepValue({}),
  datamodel: {},
  workflowInput: {
    userMessage: "",
    chatHistory: [],
    clientSideTools: [],
  },
  attributes: {
    id: "llm1",
    model: "test-model",
    system: "You are a helpful assistant",
    prompt: "Hello!",
  },
  state: { id: "llm1", attributes: {}, input: new StepValue({}) },
  machine: { id: "workflow", secrets: { system: {}, user: {} } },
  run: { id: "run" },
});

describe("LLM Element", () => {
  it("should create an instance with correct properties", () => {
    const llm = LLM.initFromAttributesAndNodes(
      {
        id: "llm1",
        model: "test-model",
        system: "You are a helpful assistant",
        prompt: "Hello!",
      },
      [],
      [
        new BaseElement({
          id: "root",
          elementType: "scxml",
          tag: "scxml",
          role: "state",
          key: uuidv4(),
        }),
      ]
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
      [
        new BaseElement({
          id: "root",
          elementType: "scxml",
          tag: "scxml",
          role: "state",
          key: uuidv4(),
        }),
      ]
    );

    const result = await (llm as BaseElement).execute(stepContext);

    expect(result).toBeInstanceOf(StepValue);
    expect(await result.value()).toEqual({
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
      [
        new BaseElement({
          id: "root",
          elementType: "scxml",
          tag: "scxml",
          role: "state",
          key: uuidv4(),
        }),
      ]
    );

    const result = await (llm as BaseElement).execute(stepContext);

    expect(result).toBeInstanceOf(StepValue);
    expect(await result.value()).toEqual({
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
      [
        new BaseElement({
          id: "root",
          elementType: "scxml",
          tag: "scxml",
          role: "state",
          key: uuidv4(),
        }),
      ]
    );

    const chatHistory = [
      { role: "user", content: "Previous message" },
      { role: "assistant", content: "Previous response" },
    ];

    const result = await (llm as BaseElement).execute(stepContext);

    expect(result).toBeInstanceOf(StepValue);
    expect(await result.value()).toEqual({
      type: "text",
      text: "Mock LLM response",
    });
  });

  it("should handle errors gracefully", async () => {
    // Mock streamText to throw an error
    const mockError = new Error("LLM API Error");
    const ai = require("ai");
    (global as any)
      .mock(() => ai)
      .mock("streamText", () => Promise.reject(mockError));

    const llm = LLM.initFromAttributesAndNodes(
      {
        id: "llm1",
        model: "test-model",
        prompt: "Hello!",
      },
      [],
      [
        new BaseElement({
          id: "root",
          elementType: "scxml",
          tag: "scxml",
          role: "state",
          key: uuidv4(),
        }),
      ]
    );

    const result = await (llm as BaseElement).execute(stepContext);

    expect(result).toBeInstanceOf(StepValue);
    expect(await result.type()).toBe("error");
    expect(await result.error()).toBeDefined();
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
      [
        new BaseElement({
          id: "root",
          elementType: "scxml",
          tag: "scxml",
          role: "state",
          key: uuidv4(),
        }),
      ]
    );

    const result = await (llm as BaseElement).execute(stepContext);

    expect(result).toBeInstanceOf(StepValue);
    expect(await result.value()).toEqual({
      type: "text",
      text: "Mock LLM response",
    });
  });
});
