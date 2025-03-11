import { describe, expect, test } from "bun:test";
import { ErrorCode } from "./utils/errorCodes";
import { ReplayableAsyncIterableStream } from "./utils/streams";
import { StepValue } from "./StepValue";
import { APIStreamEvent } from "@fireworks/types";

function toAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const item of items) {
        yield item;
      }
    },
  };
}

describe("new RunStepValue Class", () => {
  test("Take a string and return a value of string", async () => {
    const runStepInput = new StepValue({
      type: "text",
      text: "test",
    });
    await expect(runStepInput.value()).resolves.toEqual({
      type: "text",
      text: "test",
    });
  });
  test("Take a string and return an iterator", async () => {
    const runStepInput = new StepValue({
      type: "text",
      text: "test of the stream.",
    });

    const result: APIStreamEvent[] = [];
    const stream = await runStepInput.streamIterator();
    for await (const chunk of stream) {
      result.push(chunk as APIStreamEvent);
    }
    expect(result).toEqual([
      { type: "text-delta", delta: "test ", partial: "test " },
      { type: "text-delta", delta: "of ", partial: "test of " },
      { type: "text-delta", delta: "the ", partial: "test of the " },
      { type: "text", text: "test of the stream." },
    ]);
  });

  test("Take an object and return an iterator", async () => {
    const runStepInput = new StepValue({
      type: "object",
      object: { test: "test of the stream." },
      raw: JSON.stringify({ test: "test of the stream." }),
    });

    const result: APIStreamEvent[] = [];
    const stream = await runStepInput.streamIterator();
    for await (const chunk of stream) {
      result.push(chunk as APIStreamEvent);
    }
    expect(result).toEqual([
      {
        type: "object",
        object: { test: "test of the stream." },
        raw: JSON.stringify({ test: "test of the stream." }),
      },
    ]);
  });

  test("Throws an error when finish event is received but never a final value", async () => {
    const mockAsyncIterable = new ReplayableAsyncIterableStream(
      toAsyncIterable([
        { type: "text-delta", delta: "Hello", partial: "Hello" },
        { type: "text-delta", delta: " world", partial: "Hello world" },
        {
          type: "step-complete",
          finishReason: "stop",
          usage: {
            promptTokens: 200,
            completionTokens: 2000,
            totalTokens: 300,
          },
        },
      ])
    );

    const runStepInput = new StepValue(mockAsyncIterable as any);
    const iterator = await runStepInput.streamIterator();
    const result: APIStreamEvent[] = [];
    for await (const chunk of iterator) {
      result.push(chunk as APIStreamEvent);
    }

    expect(result.filter((chunk) => chunk.type === "error")).toEqual([
      {
        type: "error",
        error:
          "Error durring generation, final delta(s) were never sent from the model",
        code: ErrorCode.SERVER_ERROR,
      },
    ]);
    expect(await runStepInput.value()).toEqual({
      type: "error",
      error:
        "Error durring generation, final delta(s) were never sent from the model",
      code: ErrorCode.SERVER_ERROR,
    });
  });

  test("Take an AsyncIterable<TextStreamPart> and returns a generator of chunks", async () => {
    const mockAsyncIterable = new ReplayableAsyncIterableStream(
      toAsyncIterable([
        { type: "text-delta", delta: "Hello", partial: "Hello" },
        { type: "text-delta", delta: " world", partial: "Hello world" },
        { type: "text", text: "Hello world" },
        {
          type: "step-complete",
          finishReason: "stop",
          usage: {
            promptTokens: 200,
            completionTokens: 2000,
            totalTokens: 300,
          },
        },
      ])
    );

    const runStepInput = new StepValue(mockAsyncIterable as any);
    const iterator = await runStepInput.streamIterator();
    const result: APIStreamEvent[] = [];
    for await (const chunk of iterator) {
      result.push(chunk as APIStreamEvent);
    }

    expect(result).toEqual([
      { type: "text-delta", delta: "Hello", partial: "Hello" },
      { type: "text-delta", delta: " world", partial: "Hello world" },
      { type: "text", text: "Hello world" },
      {
        type: "step-complete",
        finishReason: "stop",
        usage: { promptTokens: 200, completionTokens: 2000, totalTokens: 300 },
      },
    ]);
    const finalResult = await runStepInput.value();
    expect(finalResult).toEqual({
      type: "text",
      text: "Hello world",
    });
  });

  test("Take a ReadableStream<ToolCallStreamPart> and returns a generator of chunks", async () => {
    const mockAsyncIterable = new ReplayableAsyncIterableStream(
      toAsyncIterable([
        {
          type: "tool-call-delta",
          toolCallId: "call_456",
          toolName: "greet",
          partial: {},
          delta: "",
        },
        {
          type: "tool-call",
          toolCallId: "call_456",
          toolName: "greet",
          args: { name: "Jane" },
        },
        {
          type: "step-complete",
          finishReason: "stop",
          usage: {
            promptTokens: 15,
            completionTokens: 25,
            totalTokens: 40,
          },
        },
      ])
    );

    const runStepInput = new StepValue(mockAsyncIterable as any);
    const iterator = runStepInput.streamIterator();
    const result: APIStreamEvent[] = [];
    for await (const chunk of iterator) {
      result.push(chunk as APIStreamEvent);
    }

    expect(result).toEqual([
      {
        type: "tool-call-delta",
        toolCallId: "call_456",
        toolName: "greet",
        partial: {},
        delta: "",
      },
      {
        type: "tool-call",
        toolCallId: "call_456",
        toolName: "greet",
        args: { name: "Jane" },
      },
      {
        type: "step-complete",
        finishReason: "stop",
        usage: {
          promptTokens: 15,
          completionTokens: 25,
          totalTokens: 40,
        },
      },
    ]);
    const finalResult = await runStepInput.value();
    expect(finalResult).toEqual({
      type: "tool-call",
      toolCallId: "call_456",
      toolName: "greet",
      args: { name: "Jane" },
    });
  });

  test("Take an AsyncIterable<TextStreamPart> with error and handles it correctly", async () => {
    const mockComplexAsyncIterable = new ReplayableAsyncIterableStream(
      toAsyncIterable([
        {
          type: "tool-call-delta",
          toolCallId: "call_789",
          toolName: "complexTool",
          partial: {},
          delta: "",
        },
        {
          type: "tool-call",
          toolCallId: "call_789",
          toolName: "complexTool",
          args: { input: "test" },
        },
        {
          type: "error",
          error: "An unexpected error occurred",
          code: ErrorCode.SERVER_ERROR,
        },
      ])
    );

    const runStepInput = new StepValue(mockComplexAsyncIterable as any);
    const iterator = await runStepInput.streamIterator();
    const result: APIStreamEvent[] = [];
    for await (const chunk of iterator) {
      result.push(chunk as APIStreamEvent);
    }

    expect(result.length).toBe(3);
    expect(result).toEqual([
      {
        type: "tool-call-delta",
        toolCallId: "call_789",
        toolName: "complexTool",
        partial: {},
        delta: "",
      },
      {
        type: "tool-call",
        toolCallId: "call_789",
        toolName: "complexTool",
        args: { input: "test" },
      },
      {
        type: "error",
        error: "An unexpected error occurred",
        code: ErrorCode.SERVER_ERROR,
      },
    ]);

    await expect(runStepInput.value()).resolves.toEqual({
      type: "error",
      error: "An unexpected error occurred",
      code: ErrorCode.SERVER_ERROR,
    });
  });

  test("get valueReady returns true for a stream", async () => {
    const stream = new ReplayableAsyncIterableStream(
      toAsyncIterable([
        {
          type: "text-delta",
          partial: "llm_call_output",
          delta: "llm_call_output",
        },
        {
          type: "text-delta",
          partial: "llm_call_output llm_call_output 2",
          delta: " llm_call_output 2",
        },
        {
          type: "text-delta",
          partial: "llm_call_output llm_call_output 2 llm_call_output 3",
          delta: " llm_call_output 3",
        },
        {
          type: "text-delta",
          partial:
            "llm_call_output llm_call_output 2 llm_call_output 3 llm_call_output 4",
          delta: " llm_call_output 4",
        },
        {
          type: "text-delta",
          partial:
            "llm_call_output llm_call_output 2 llm_call_output 3 llm_call_output 4 llm_call_output 5",
          delta: " llm_call_output 5",
        },
        {
          type: "text",
          text: "llm_call_output llm_call_output 2 llm_call_output 3 llm_call_output 4 llm_call_output 5",
        },
      ])
    );
    const runStepInput = new StepValue(stream as any);
    expect(runStepInput.valueReady).toBe(false);
    await runStepInput.waitForValue();

    expect(runStepInput.valueReady).toBe(true);
  }, 60);

  test("get valueReady returns true immediately for a non-streaming value", async () => {
    const runStepInput = new StepValue({ type: "text", text: "test" });
    expect(runStepInput.valueReady).toBe(true);
  });

  test("streams text content with non-space ending correctly", async () => {
    const runStepInput = new StepValue({
      type: "text",
      text: "Here is my calculation: \\boxed{42}",
    });

    const result: APIStreamEvent[] = [];
    const stream = await runStepInput.streamIterator();
    for await (const chunk of stream) {
      result.push(chunk as APIStreamEvent);
    }

    expect(result).toEqual([
      { type: "text-delta", delta: "Here ", partial: "Here " },
      { type: "text-delta", delta: "is ", partial: "Here is " },
      { type: "text-delta", delta: "my ", partial: "Here is my " },
      {
        type: "text-delta",
        delta: "calculation: ",
        partial: "Here is my calculation: ",
      },
      { type: "text", text: "Here is my calculation: \\boxed{42}" },
    ]);

    // Also verify the final value
    const value = await runStepInput.value();
    expect(value).toEqual({
      type: "text",
      text: "Here is my calculation: \\boxed{42}",
    });
  });
});
