import { describe, expect, test } from "vitest";
import { BaseElement } from "../element/BaseElement";
import { ReplayableAsyncIterableStream } from "../utils/streams";
import { StepValue } from "./StepValue";
import { RunValue } from "./RunValue";
import { APIStreamEvent } from "../types";

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
        tag: "invoke",
        elementType: "invoke",
        attributes: {},
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
        tag: "invoke",
        elementType: "invoke",
        attributes: {},
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
        tag: "final",
        elementType: "final",
        attributes: {},
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

  // test('should create a multiplexed stream', async () => {
  //   const runValue = new RunValue({
  //     runId: 'run-uuid',
  //     machine: {
  //       isFinishedState: () => false,
  //       isInitialState: () => false,
  //       isErrorState: () => false,
  //     } as any,
  //   });
  //   const mockRunStepValue_1 = new RunStepValue({
  //     type: 'text',
  //     text: 'test-stream-1',
  //   });

  //   const mockIterator = new ReplayableAsyncIterableStream([
  //     { type: 'text-delta', partial: 'test-stream-1', delta: 'test-stream-1' },
  //     { type: 'text-delta', partial: 'test-stream-2', delta: 'test-stream-2' },
  //   ]);
  //   const mockRunStepValue_2 = new RunStepValue(mockIterator as any);

  //   const state = new SequentialState({
  //     name: 'TestStep1',
  //     type: 'GENERIC_AI_TASK',
  //     previousStateId: null,
  //   });
  //   await runValue.addRunStep({
  //     ...state,
  //     result: mockRunStepValue_1,
  //   });

  //   const state2 = new SequentialState({
  //     name: 'TestStep2',
  //     type: 'GENERIC_AI_TASK',
  //     previousStateId: null,
  //   });
  //   await runValue.addRunStep({
  //     ...state2,
  //     result: mockRunStepValue_2,
  //   });

  //   const stream = await runValue.multiplexedStream();
  //   const reader = stream.getReader();
  //   const decode = new TextDecoder().decode;

  //   const { value: chunk1 } = await reader.read();

  //   const text1 = new TextDecoder().decode(chunk1).replace('[data] ', '');
  //   const chunk = JSON.parse(text1);
  //   expect(chunk.step).toEqual('TestStep1');
  //   expect(chunk.type).toEqual('GENERIC_AI_TASK');
  //   expect(chunk.event).toEqual({
  //     type: 'text-delta',
  //     partial: 'test-stream-1',
  //     delta: 'test-stream-1',
  //   });

  //   const { value: textChunk1End } = await reader.read();
  //   const textEnd = new TextDecoder().decode(textChunk1End).replace('[data] ', '');
  //   const chunk1End = JSON.parse(textEnd);
  //   expect(chunk1End.step).toEqual('TestStep1');
  //   expect(chunk1End.type).toEqual('GENERIC_AI_TASK');
  //   expect(chunk1End.event).toEqual({
  //     type: 'text',
  //     text: 'test-stream-1',
  //   });

  //   const { value: txtchunk2 } = await reader.read();
  //   const text2 = new TextDecoder().decode(txtchunk2).replace('[data] ', '');

  //   const chunk2 = JSON.parse(text2);
  //   expect(chunk2.step).toEqual('TestStep2');
  //   expect(chunk2.type).toEqual('GENERIC_AI_TASK');

  //   expect(chunk2.event).toEqual({
  //     type: 'text-delta',
  //     partial: 'test-stream-1',
  //     delta: 'test-stream-1',
  //   });

  //   const { value: textchunk3 } = await reader.read();
  //   const text3 = new TextDecoder().decode(textchunk3).replace('[data] ', '');

  //   const chunk3 = JSON.parse(text3);
  //   expect(chunk3.step).toEqual('TestStep2');
  //   expect(chunk3.type).toEqual('GENERIC_AI_TASK');

  //   expect(chunk3.event).toEqual({
  //     type: 'text-delta',
  //     partial: 'test-stream-2',
  //     delta: 'test-stream-2',
  //   });

  //   runValue.finalize();
  //   const { value: doneMsg } = await reader.read();
  //   const textDone = new TextDecoder().decode(doneMsg).replace('[data] ', '');
  //   expect(textDone).toBe('[done]');
  //   const { done } = await reader.read();
  //   expect(done).toBe(true);
  // });

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
        tag: "invoke",
        elementType: "invoke",
        attributes: {},
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
        tag: "final",
        elementType: "final",
        attributes: {},
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

  // test.skip('should return valid token usage both streaming and non-streaming', async () => {
  //   const stateRunners = {
  //     [runSteps.START.type]: runSteps.START,
  //     [runSteps.RESPOND.type]: runSteps.RESPOND,
  //     [runSteps.GENERIC_AI_TASK.type]: runSteps.GENERIC_AI_TASK,
  //     [runSteps.ERROR.type]: runSteps.ERROR,
  //   };
  //   const machine = new Machine(threeLLMCallsToCountTokens, stateRunners);
  //   const stateMachine = new StateMachine({
  //     machine,
  //     stateRunners,
  //   });

  //   const result = await stateMachine.run(
  //     'Can you come up with a 12 bar chord progression in C that works in the lydian mode?',
  //     [],
  //     {},
  //   );

  //   const nonStreamingOutput = await result.responseValue();
  //   expect(nonStreamingOutput.type).toEqual('text');
  //   expect((nonStreamingOutput as any).text).toEqual('C');
  //   const nonStreamingTokens = result.getTotalTokens();
  //   expect(nonStreamingTokens.completionTokens).toEqual(2);
  //   expect(nonStreamingTokens.promptTokens).toEqual(33);
  //   expect(nonStreamingTokens.totalTokens).toEqual(35);
  //   expect(nonStreamingTokens.reasoningTokens).toEqual(70);

  //   const responseStream = await result.responseIterator();
  //   const chunks = [];
  //   for await (const chunk of responseStream) {
  //     chunks.push(chunk);
  //   }
  //   expect(chunks.length).toEqual(3);
  //   expect(chunks[0].type).toEqual('text-delta');
  //   expect(chunks[1].type).toEqual('text');
  //   expect(chunks[2].type).toEqual('step-complete');
  //   const lastChunk = chunks[chunks.length - 1];

  //   expect(lastChunk.type).toEqual('step-complete');
  //   const usage = (lastChunk as any).usage;
  //   expect(usage.completionTokens).toEqual(2);
  //   expect(usage.promptTokens).toEqual(33);
  //   expect(usage.totalTokens).toEqual(35);
  //   expect(usage.reasoningTokens).toEqual(70);
  // }, 10000);
});
