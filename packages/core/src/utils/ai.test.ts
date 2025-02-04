import { createOpenAI } from "@ai-sdk/openai";
import { Unkey } from "@unkey/api";
import { streamObject, streamText, tool } from "ai";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import type { APIStreamEvent } from "../types";
import { aiStreamToFireAgentStream } from "./ai";

describe.skip("aiStreamToFireAgentStream", () => {
  let unkey: Unkey;
  let apiKey: string;
  let apiKeyId: string;
  let fireworks: ReturnType<typeof createOpenAI>;
  beforeAll(async () => {
    unkey = new Unkey({
      rootKey: process.env.UNKEY_ROOT_KEY!,
      baseUrl: "https://fireworks.unkey.dev",
    });
    const createKeyResult = await unkey.keys.create({
      apiId: process.env.UNKEY_API_ID!,
      ownerId: "fireworks",
      roles: ["account-type-enterprise"],
    });

    try {
      apiKey = createKeyResult.result!.key;
      apiKeyId = createKeyResult.result!.keyId;
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));
    }
    if (!apiKey) {
      console.error(JSON.stringify(createKeyResult, null, 2));
      throw new Error("No API key found");
    }
    fireworks = createOpenAI({
      apiKey: apiKey,
      baseURL:
        process.env.FIREWORKS_MIDDLEWARE_URL ||
        "https://api.fireworks.ai/inference/v1",
    });
  });
  afterAll(async () => {
    await unkey.keys.delete({ keyId: apiKeyId });
  });

  it("should convert text-delta events correctly", async () => {
    const testStream = await streamText({
      model: fireworks("accounts/fireworks/models/llama-v3p1-8b-instruct"),
      messages: [{ role: "user", content: "Hello, world!" }],
      temperature: 0,
    });

    const result = aiStreamToFireAgentStream(testStream.fullStream);
    const events: APIStreamEvent[] = [];

    for await (const event of result) {
      events.push(event);
    }
    // Ensure we have more than one text-delta event
    expect(
      events.filter((event) => event.type === "text-delta").length
    ).toBeGreaterThan(1);

    // Ensure we have a text event
    expect(events.filter((event) => event.type === "text").length).toBe(1);
    expect(
      (events.filter((event) => event.type === "text")[0] as any).text
    ).toBeTypeOf("string");
    expect(
      (events.filter((event) => event.type === "text")[0] as any).text.length
    ).toBeGreaterThan(4);

    // Ensure we have a step-complete event
    expect(
      events.filter((event) => event.type === "step-complete").length
    ).toBe(1);

    // Check the structure of the events
    events.forEach((event) => {
      if (event.type === "text-delta") {
        expect(event).toHaveProperty("delta");
        expect(event).toHaveProperty("partial");
      } else if (event.type === "text") {
        expect(event).toHaveProperty("text");
      } else if (event.type === "step-complete") {
        expect(event).toHaveProperty("finishReason");
        expect(event).toHaveProperty("usage");
      }
    });
  });

  it("should convert object events correctly", async () => {
    const testStream = await streamObject({
      model: fireworks("accounts/fireworks/models/firefunction-v2"),
      messages: [{ role: "user", content: "Mike is 25 years old." }],
      temperature: 0,
      schema: z.object({
        name: z.string(),
        age: z.number(),
      }),
    });

    const stream = testStream.fullStream;
    const result = aiStreamToFireAgentStream(stream);
    const events: APIStreamEvent[] = [];

    for await (const event of result) {
      events.push(event);
    }

    // Ensure we have more than one delta event
    expect(
      events.filter((event) => event.type === "object-delta").length
    ).toBeGreaterThan(0);

    // Ensure we have a tool-call event
    expect(events.filter((event) => event.type === "object").length).toBe(1);
    // Ensure we have a step-complete event
    expect(
      events.filter((event) => event.type === "step-complete").length
    ).toBe(1);

    // Check the structure of the events
    events.forEach((event) => {
      if (event.type === "object-delta") {
        expect(event).toHaveProperty("delta");
        expect(event).toHaveProperty("partial");
      } else if (event.type === "object") {
        expect(event).toHaveProperty("object");
        expect(() => JSON.parse(JSON.stringify(event.object))).not.toThrow();
        expect(typeof event.object).toBe("object");
        expect(event.object).not.toBeNull();
        expect(Object.keys(event.object)).toContain("name");
        expect(Object.keys(event.object)).toContain("age");
        expect(typeof event.object.name).toBe("string");
        expect(typeof event.object.age).toBe("number");
      } else if (event.type === "step-complete") {
        expect(event).toHaveProperty("finishReason");
        expect(event).toHaveProperty("usage");
      }
    });
  });

  it("should handle tool call events correctly", async () => {
    const testStream = await streamText({
      model: fireworks("accounts/fireworks/models/firefunction-v2"),
      messages: [
        { role: "user", content: "What is the weather in San Francisco?" },
      ],
      temperature: 0,
      tools: {
        weather: tool({
          description: "Get the weather in a location",
          parameters: z.object({
            location: z
              .string()
              .describe("The location to get the weather for"),
            temperature: z
              .number()
              .describe("The temperature in degrees Fahrenheit"),
          }),
          execute: async ({ location }) => ({
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          }),
        }),
      },
    });

    const result = aiStreamToFireAgentStream(testStream.fullStream);
    const events: APIStreamEvent[] = [];

    for await (const event of result) {
      events.push(event);
    }

    // Ensure we have more than one delta event
    expect(
      events.filter((event) => event.type === "tool-call-delta").length
    ).toBeGreaterThan(0);

    // Ensure we have a tool-call event
    expect(events.filter((event) => event.type === "tool-call").length).toBe(1);
    // Ensure we have a step-complete event
    expect(
      events.filter((event) => event.type === "step-complete").length
    ).toBe(1);

    // Check the structure of the events
    events.forEach((event) => {
      if (event.type === "tool-call-delta") {
        expect(event).toHaveProperty("delta");
        expect(event).toHaveProperty("partial");
        expect(event).toHaveProperty("toolCallId");
        expect(event).toHaveProperty("toolName");
      } else if (event.type === "tool-call") {
        expect(event).toHaveProperty("toolCallId");
        expect(event).toHaveProperty("toolName");
        expect(event).toHaveProperty("args");
        expect(event.args).toHaveProperty("location");
      } else if (event.type === "step-complete") {
        expect(event).toHaveProperty("finishReason");
        expect(event).toHaveProperty("usage");
      }
    });
  });
});
