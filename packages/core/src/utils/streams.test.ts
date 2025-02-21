import { describe, expect, it } from "vitest";
import type { RunEvent, APIStreamEvent } from "../types";
import { ReplayableAsyncIterableStream } from "./streams";

describe("AsyncIterableStream", () => {
  describe("constructor", () => {
    it("should create an instance with an array of events", () => {
      const events = ["event1", "event2", "event3"];
      const stream = new ReplayableAsyncIterableStream(events);
      expect(stream).toBeInstanceOf(ReplayableAsyncIterableStream);
    });

    it("should create an instance with an async generator function", () => {
      const events = async function* () {
        yield "event1";
        yield "event2";
        yield "event3";
      };
      const stream = new ReplayableAsyncIterableStream(events);
      expect(stream).toBeInstanceOf(ReplayableAsyncIterableStream);
    });
  });

  describe("ReadableStream behavior", () => {
    it("should properly enqueue and read events from an array", async () => {
      const events = ["event1", "event2", "event3"];
      const stream = new ReplayableAsyncIterableStream(events);
      const reader = stream.getReader();

      for (const expectedEvent of events) {
        const { value, done } = await reader.read();
        expect(value).toBe(expectedEvent);
        expect(done).toBe(false);
      }

      const { value, done } = await reader.read();
      expect(value).toBeUndefined();
      expect(done).toBe(true);
    });

    it("should properly enqueue and read events from an async generator", async () => {
      const events = async function* () {
        yield "event1";
        yield "event2";
        yield "event3";
      };
      const stream = new ReplayableAsyncIterableStream(events);
      const reader = stream.getReader();

      const expectedEvents = ["event1", "event2", "event3"];
      for (const expectedEvent of expectedEvents) {
        const { value, done } = await reader.read();

        expect(value).toBe(expectedEvent);
        expect(done).toBe(false);
      }

      const { value, done } = await reader.read();
      expect(value).toBeUndefined();
      expect(done).toBe(true);
    });

    it("should be able to repeatedly read events from an async generator", async () => {
      const events = async function* () {
        yield "event1";
        yield "event2";
        yield "event3";
      };
      const stream = new ReplayableAsyncIterableStream(events);
      const reader = stream.getReader();

      const expectedEvents = ["event1", "event2", "event3"];
      for (const expectedEvent of expectedEvents) {
        const { value, done } = await reader.read();
        expect(value).toBe(expectedEvent);
        expect(done).toBe(false);
      }

      const { value, done } = await reader.read();
      expect(value).toBeUndefined();
      expect(done).toBe(true);

      const reader2 = stream.getReader();

      for (const expectedEvent of [...expectedEvents, undefined]) {
        const { value, done } = await reader2.read();

        expect(value).toBe(expectedEvent);
        expect(done).toBe(expectedEvent === undefined);
      }

      const { value: value2, done: done2 } = await reader2.read();
      expect(value2).toBeUndefined();
      expect(done2).toBe(true);
    });

    it("should respect the delay when provided", async () => {
      const events = ["event1", "event2", "event3"];
      const delay = 10;
      const stream = new ReplayableAsyncIterableStream(events, delay);
      const reader = stream.getReader();

      for (const expectedEvent of events) {
        const readPromise = reader.read();
        await new Promise((resolve) => setTimeout(resolve, delay + 2));
        const { value, done } = await readPromise;
        expect(value).toBe(expectedEvent);
        expect(done).toBe(false);
      }

      const { value, done } = await reader.read();
      expect(value).toBeUndefined();
      expect(done).toBe(true);
    });
  });

  describe("AsyncIterable behavior", () => {
    it("should be iterable with for-await-of when using an array", async () => {
      const events = ["event1", "event2", "event3"];
      const stream = new ReplayableAsyncIterableStream(events, 2);

      const result: string[] = [];
      for await (const event of stream) {
        result.push(event);
      }

      expect(result).toEqual(events);
    });

    it("should be iterable with for-await-of when using an async generator", async () => {
      const expectedEvents = ["event1", "event2", "event3"];
      const events = async function* () {
        yield* expectedEvents;
      };
      const stream = new ReplayableAsyncIterableStream(events);

      const result: string[] = [];
      for await (const event of stream) {
        result.push(event);
      }

      expect(result).toEqual(expectedEvents);
    });

    it("should respect the delay when iterating", async () => {
      const events = ["event1", "event2", "event3"];
      const delay = 10;
      const stream = new ReplayableAsyncIterableStream(events, delay);

      const result: string[] = [];
      for await (const event of stream) {
        result.push(event);
        await new Promise((resolve) => setTimeout(resolve, delay + 2));
      }

      expect(result).toEqual(events);
    });
  });

  describe("Type handling", () => {
    it("should handle RunEvent type", () => {
      const events: RunEvent[] = [
        {
          type: "CALL_EXTERNAL_API",
          uuid: "123",
          runId: "1",
          step: "1",
          event: {
            type: "api-call",
            apiName: "apiName",
            operationId: "operationId",
            request: {
              method: "GET",
              url: "https://api.example.com",
              headers: {},
              body: {},
            },
          },
        },
        {
          type: "NO_NEXT_STEP",
          uuid: "456",
          runId: "1",
          step: "2",
          event: {
            type: "step-complete",
            finishReason: "stop",
            usage: {
              promptTokens: 100,
              completionTokens: 100,
              totalTokens: 200,
            },
          },
        },
      ];
      const stream = new ReplayableAsyncIterableStream<RunEvent>(events);
      expect(stream).toBeInstanceOf(ReplayableAsyncIterableStream);
    });

    it("should handle APIStreamEvent type", () => {
      const events: APIStreamEvent[] = [
        { type: "text-delta", delta: "something", partial: "something" },
        { type: "text", text: "something" },
      ];
      const stream = new ReplayableAsyncIterableStream<APIStreamEvent>(events);
      expect(stream).toBeInstanceOf(ReplayableAsyncIterableStream);
    });

    it("should handle mixed types", () => {
      const events: (RunEvent | APIStreamEvent | string)[] = [
        {
          type: "step-complete",
          finishReason: "stop",
          usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
        },
        "string event",
      ];
      const stream = new ReplayableAsyncIterableStream(events);
      expect(stream).toBeInstanceOf(ReplayableAsyncIterableStream);
    });
  });
});
