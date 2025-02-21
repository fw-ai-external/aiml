import { describe, expect, test } from "vitest";
import { BaseElement } from "./BaseElement";
import { ReplayableAsyncIterableStream } from "../utils/streams";
import { StepValue } from "./StepValue";
import { RunValue } from "./RunValue";
import { APIStreamEvent } from "../types";
import { v4 as uuidv4 } from "uuid";

describe("RunValue unit tests", () => {
  test("should add a RunStepValue correctly", async () => {
    const runValue = new RunValue({
      runId: "run-uuid",
    });

    const mockRunStepValue = new StepValue({
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
    const runValue = new RunValue({
      runId: "run-uuid",
    });

    const mockRunStepValue = new StepValue({
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

    const mockFinalRunStepValue = new StepValue({
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

    expect(runValue.allValues).toHaveLength(2);
    expect(runValue.allValues[1].id).toEqual(mockFinalRunStepValue.id);
    expect(await runValue.allValues[1].type()).toEqual("text");
    expect(await runValue.responseValue()).toEqual({
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
    const mockRunStepValue_1 = new StepValue({
      type: "text",
      text: "test-stream-1",
    });

    const mockIterator = new ReplayableAsyncIterableStream([
      { type: "text-delta", partial: "test-stream-1", delta: "test-stream-1" },
      {
        type: "text-delta",
        partial: "test-stream-1test-stream-2",
        delta: "test-stream-2",
      },
      { type: "text", text: "test-stream-1test-stream-2" },
    ]);
    const mockRunStepValue_2 = new StepValue(mockIterator as any);

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

    await expect(mockRunStepValue_2.value()).resolves.toEqual({
      type: "text",
      text: "test-stream-1test-stream-2",
    });

    const chunks: APIStreamEvent[] = [];
    for await (const chunk of await mockRunStepValue_2.streamIterator()) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual([
      { type: "text-delta", partial: "test-stream-1", delta: "test-stream-1" },
      {
        type: "text-delta",
        partial: "test-stream-1test-stream-2",
        delta: "test-stream-2",
      },
      { type: "text", text: "test-stream-1test-stream-2" },
    ]);

    const doneValue = await runValue.responseValue();
    expect(doneValue).toEqual({
      type: "text",
      text: "test-stream-1test-stream-2",
    });

    const stream = await runValue.responseStream();
    const reader = stream.getReader();

    const { value: chunk1 } = await reader.read();

    const text1 = new TextDecoder().decode(chunk1).replace("[data] ", "");
    expect(JSON.parse(text1)).toEqual({
      type: "text-delta",
      partial: "test-stream-1",
      delta: "test-stream-1",
    });

    const { value: chunk2 } = await reader.read();
    const text2 = new TextDecoder().decode(chunk2).replace("[data] ", "");

    expect(JSON.parse(text2)).toEqual({
      type: "text-delta",
      partial: "test-stream-1test-stream-2",
      delta: "test-stream-2",
    });

    const { value: chunk3 } = await reader.read();
    const text3 = new TextDecoder().decode(chunk3).replace("[data] ", "");

    expect(JSON.parse(text3)).toEqual({
      type: "text",
      text: "test-stream-1test-stream-2",
    });

    await runValue.finalize();
    const { value: doneMsg } = await reader.read();
    const textDone = new TextDecoder().decode(doneMsg).replace("[data] ", "");
    expect(textDone).toBe("[done]");
    const { done } = await reader.read();
    expect(done).toBe(true);
  });
});
