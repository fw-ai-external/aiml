import { describe, expect, test, beforeEach, mock } from "bun:test";
import { ReplayableAsyncIterableStream } from "@fireworks/shared";
import { StepValue } from "@fireworks/shared";
import { RunValue } from "./RunValue";
import type { APIStreamEvent } from "@fireworks/types";
import type { ElementType } from "@fireworks/types";

type MockStepValueData =
  | {
      type: "text";
      text: string;
    }
  | ReplayableAsyncIterableStream<APIStreamEvent>;

function createMockStepValue(data: MockStepValueData): StepValue {
  const stepValue = new StepValue(data);

  const originalStreamIterator = stepValue.streamIterator.bind(stepValue);
  stepValue.streamIterator = mock(
    async function* (): AsyncIterableIterator<APIStreamEvent> {
      if (typeof data === "object" && "text" in data) {
        yield { type: "text", text: data.text } as APIStreamEvent;
        return;
      }

      if (data instanceof ReplayableAsyncIterableStream) {
        yield* await originalStreamIterator();
      } else {
        yield data as APIStreamEvent;
      }
    }
  );

  Object.defineProperty(stepValue, "valueReady", {
    get: () => true,
  });

  return stepValue;
}

function createMockStep(config: {
  id: string;
  elementType: ElementType;
  input: StepValue;
  output: StepValue;
}) {
  return {
    id: config.id,
    elementType: config.elementType,
    path: [],
    status: "active",
    input: config.input,
    output: config.output,
  };
}

describe("RunValue", () => {
  let runValue: RunValue;
  const RUN_ID = "test-run-uuid";

  beforeEach(() => {
    runValue = new RunValue({ runId: RUN_ID });
  });

  describe("state management", () => {
    test("should initialize with correct runId", () => {
      expect(runValue.uuid).toBe(RUN_ID);
      expect(runValue.finished).toBe(false);
      expect(runValue.allValues).toHaveLength(0);
    });

    test("should add step and maintain correct order", async () => {
      const mockValue1 = createMockStepValue({ type: "text", text: "first" });
      const mockValue2 = createMockStepValue({ type: "text", text: "second" });

      const step1 = createMockStep({
        id: "step1",
        elementType: "invoke",
        input: mockValue1,
        output: mockValue1,
      });

      const step2 = createMockStep({
        id: "step2",
        elementType: "invoke",
        input: mockValue2,
        output: mockValue2,
      });

      runValue.addActiveStep(step1);
      runValue.addActiveStep(step2);

      expect(runValue.allValues).toHaveLength(2);
      expect(await runValue.allValues[0].type()).toBe("text");
      expect(await runValue.allValues[1].type()).toBe("text");
    });
  });

  describe("finalization", () => {
    test("should properly finalize run value", async () => {
      const mockValue = createMockStepValue({ type: "text", text: "final" });
      const finalStep = createMockStep({
        id: "final",
        elementType: "final",
        input: mockValue,
        output: mockValue,
      });

      runValue.addActiveStep(finalStep);
      await runValue.finalize();

      expect(runValue.finished).toBe(true);
      const response = await runValue.responseValue();
      expect(response).toEqual({ type: "text", text: "final" });
    });

    test("should handle empty run value finalization", async () => {
      await runValue.finalize();
      expect(runValue.finished).toBe(true);
      const response = await runValue.responseValue();
      expect(response).toEqual({ type: "text", text: "No output available" });
    });
  });

  describe("streaming", () => {
    test("should properly handle streaming responses", async () => {
      const mockEvents: APIStreamEvent[] = [
        { type: "text-delta", partial: "part1", delta: "part1" } as const,
        { type: "text-delta", partial: "part1part2", delta: "part2" } as const,
        { type: "text", text: "part1part2" } as const,
      ];

      const mockStream = new ReplayableAsyncIterableStream<APIStreamEvent>(
        mockEvents as any
      );
      const mockValue = createMockStepValue(mockStream);

      const streamStep = createMockStep({
        id: "stream",
        elementType: "final",
        input: mockValue,
        output: mockValue,
      });

      runValue.addActiveStep(streamStep);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await runValue.finalize();

      const stream = await runValue.responseStream();
      const reader = stream.getReader();

      const chunks: APIStreamEvent[] = [];
      let done = false;

      while (!done) {
        const result = await reader.read();
        if (result.done) {
          done = true;
        } else {
          const data = JSON.parse(
            new TextDecoder().decode(result.value).replace("[data] ", "")
          );
          chunks.push(data);
        }
      }

      expect(chunks).toEqual(mockEvents);
      const finalResponse = await runValue.responseValue();
      expect(finalResponse).toEqual({ type: "text", text: "part1part2" });
    });

    test("should handle empty stream", async () => {
      const mockEvents: APIStreamEvent[] = [];
      const mockStream = new ReplayableAsyncIterableStream<APIStreamEvent>(
        mockEvents as any
      );
      const mockValue = createMockStepValue(mockStream);

      const streamStep = createMockStep({
        id: "empty-stream",
        elementType: "final",
        input: mockValue,
        output: mockValue,
      });

      runValue.addActiveStep(streamStep);
      await runValue.finalize();

      const stream = await runValue.responseStream();
      const reader = stream.getReader();
      const result = await reader.read();

      expect(result.value).toEqual(new TextEncoder().encode("[done]"));
      expect(result.done).toBe(false);
    });
  });
});
