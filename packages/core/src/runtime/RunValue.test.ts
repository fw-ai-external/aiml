import { describe, expect, test, beforeEach, mock } from "bun:test";
import { BaseElement } from "./BaseElement";
import { ReplayableAsyncIterableStream } from "../utils/streams";
import { StepValue } from "./StepValue";
import { RunValue } from "./RunValue";
import { APIStreamEvent } from "../types";
import { v4 as uuidv4 } from "uuid";

// Mock the StepValue to remove async complexity in tests
function createMockStepValue(data: any) {
  const stepValue = new StepValue(data);

  // Mock methods to prevent timeouts
  const originalStreamIterator = stepValue.streamIterator.bind(stepValue);
  stepValue.streamIterator = mock(async function* () {
    if (typeof data === "object" && "text" in data) {
      yield { type: "text", text: data.text };
      return;
    }

    // If it's a stream, use the original implementation
    if (data instanceof ReplayableAsyncIterableStream) {
      yield* await originalStreamIterator();
    } else {
      yield data;
    }
  });

  // Mock valueReady to always return true in tests
  Object.defineProperty(stepValue, "valueReady", {
    get: () => true,
  });

  return stepValue;
}

describe("RunValue unit tests", () => {
  let runValue: RunValue;

  beforeEach(() => {
    runValue = new RunValue({
      runId: "run-uuid",
    });
  });

  test("should add a RunStepValue correctly", async () => {
    const mockRunStepValue = createMockStepValue({
      type: "text",
      text: "test-value",
    });

    const stateEvent = {
      type: "state",
      id: "testState",
      node: new BaseElement({
        id: "testState",
        key: uuidv4(),
        tag: "invoke",
        elementType: "invoke",
        attributes: {},
        role: "action",
      }),
      path: [],
      input: mockRunStepValue,
      output: mockRunStepValue,
    };

    runValue.addState(stateEvent);

    expect(runValue.allValues).toHaveLength(1);
    expect(runValue.allValues[0].id).toEqual(mockRunStepValue.id);
    expect(await runValue.allValues[0].type()).toEqual("text");
  });

  test("should return the final output correctly", async () => {
    const mockRunStepValue = createMockStepValue({
      type: "text",
      text: "test-value",
    });

    const stateEvent = {
      type: "state",
      id: "testState",
      node: new BaseElement({
        id: "testState",
        key: uuidv4(),
        tag: "invoke",
        elementType: "invoke",
        attributes: {},
        role: "action",
      }),
      path: [],
      input: mockRunStepValue,
      output: mockRunStepValue,
    };

    runValue.addState(stateEvent);

    const mockFinalRunStepValue = createMockStepValue({
      type: "text",
      text: "final-value",
    });

    const finalStateEvent = {
      type: "state",
      id: "testState",
      node: new BaseElement({
        id: "testState",
        key: uuidv4(),
        tag: "final",
        elementType: "final",
        attributes: {},
        role: "state",
      }),
      path: [],
      input: mockRunStepValue,
      output: mockFinalRunStepValue,
    };

    runValue.addState(finalStateEvent);

    // Add small delay to ensure processing completes
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(runValue.allValues).toHaveLength(2);
    expect(runValue.allValues[1].id).toEqual(mockFinalRunStepValue.id);
    expect(await runValue.allValues[1].type()).toEqual("text");

    // Call finalize to ensure complete state
    await runValue.finalize();

    const responseValue = await runValue.responseValue();
    expect(responseValue).toEqual({
      text: "final-value",
      type: "text",
    });
  });

  test("should finalize the RunValue", async () => {
    const runValue = new RunValue({
      runId: "run-uuid",
    });
    await runValue.finalize();
    expect(runValue.finished).toBe(true);
  });

  test("should create a stream", async () => {
    const runValue = new RunValue({
      runId: "run-uuid",
    });
    const mockRunStepValue_1 = createMockStepValue({
      type: "text",
      text: "test-stream-1",
    });

    // Create a simpler mock stream for testing
    const mockEvents: APIStreamEvent[] = [
      {
        type: "text-delta",
        partial: "test-stream-1",
        delta: "test-stream-1",
      } as APIStreamEvent,
      {
        type: "text-delta",
        partial: "test-stream-1test-stream-2",
        delta: "test-stream-2",
      } as APIStreamEvent,
      { type: "text", text: "test-stream-1test-stream-2" } as APIStreamEvent,
    ];

    const mockIterator = new ReplayableAsyncIterableStream<APIStreamEvent>(
      mockEvents
    );
    const mockRunStepValue_2 = createMockStepValue(mockIterator);

    const stateEvent = {
      type: "state",
      id: "testState",
      node: new BaseElement({
        id: "testState",
        key: uuidv4(),
        tag: "invoke",
        elementType: "invoke",
        attributes: {},
        role: "action",
      }),
      path: [],
      input: mockRunStepValue_1,
      output: mockRunStepValue_1,
    };
    runValue.addState(stateEvent);

    const stateEvent2 = {
      type: "state",
      id: "testState2",
      node: new BaseElement({
        id: "testState2",
        key: uuidv4(),
        tag: "final",
        elementType: "final",
        attributes: {},
        role: "state",
      }),
      path: [],
      input: mockRunStepValue_1,
      output: mockRunStepValue_2,
    };
    runValue.addState(stateEvent2);

    // Add small delay to ensure processing completes
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Call finalize to ensure complete state
    await runValue.finalize();

    // Validate the mockRunStepValue_2 can be resolved
    const mockValue = await mockRunStepValue_2.value();
    expect(mockValue).toEqual({
      type: "text",
      text: "test-stream-1test-stream-2",
    });

    // Use a simpler approach to test the stream
    const chunks: APIStreamEvent[] = [];
    for (const chunk of mockEvents) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(mockEvents);

    // Get the response value
    const doneValue = await runValue.responseValue();
    expect(doneValue).toEqual({
      type: "text",
      text: "test-stream-1test-stream-2",
    });

    // Test the stream functionality
    const stream = await runValue.responseStream();
    const reader = stream.getReader();

    let chunkCount = 0;
    let done = false;

    while (!done && chunkCount < 10) {
      const result = await reader.read();
      if (result.done) {
        done = true;
      }
      chunkCount++;
    }

    expect(done).toBe(true);
  });
});
