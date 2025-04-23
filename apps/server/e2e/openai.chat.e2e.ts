import { test, expect } from "bun:test";
import fs from "fs";
import path from "path";
import { app } from "../src";

// Helper function to read AIML file content
function readAimlFile(filePath: string): string {
  return fs.readFileSync(path.join("..", "..", "examples", filePath), "utf-8");
}

// Helper function to make a request to the chat endpoint
async function makeRequest(
  aimlContent: string,
  userMessage: string,
  stream: boolean = false
) {
  const response = await app.request("/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.FIREWORKS_API_KEY!,
    },
    body: JSON.stringify({
      model: "does not matter",
      messages: [
        {
          role: "system",
          content: aimlContent,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      stream: stream,
    }),
  });

  return response;
}

// Helper function to process streaming response
async function processStreamingResponse(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is null");
  }

  const decoder = new TextDecoder();
  let chunks = [];
  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      const chunk = decoder.decode(value);
      chunks.push(chunk);
    }
  }

  return chunks;
}

// Test each AIML file in the examples directory
const exampleDirs = [
  "Character PersonaGenerator",
  "CodeReviewer",
  "FinalStateTest",
  "InvestmentAdvisor",
  "JustPrompt",
  "MedicalDiagnosis",
  "RecipeGenerator",
  "SimpleChain",
  "SimpleRouter",
];

// Test each AIML file with streaming disabled
exampleDirs.forEach((dir) => {
  test(`${dir} - non-streaming`, async () => {
    const aimlPath = path.join(dir, "index.aiml");
    const aimlContent = readAimlFile(aimlPath);

    const response = await makeRequest(
      aimlContent,
      "Hello, can you help me?",
      false
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.choices).toBeDefined();
    expect(data.choices.length).toBeGreaterThan(0);
    expect(data.choices[0].message).toBeDefined();
    expect(data.choices[0].message.content).toBeDefined();
  });
});

// Test each AIML file with streaming enabled
exampleDirs.forEach((dir) => {
  test(`${dir} - streaming`, async () => {
    const aimlPath = path.join(dir, "index.aiml");
    const aimlContent = readAimlFile(aimlPath);

    const response = await makeRequest(
      aimlContent,
      "Hello, can you help me?",
      true
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const chunks = await processStreamingResponse(response);
    expect(chunks.length).toBeGreaterThan(0);

    // Verify that the chunks contain valid SSE data
    const validChunk = chunks.some(
      (chunk) =>
        chunk.includes("data:") &&
        (chunk.includes("content") || chunk.includes("delta"))
    );

    expect(validChunk).toBe(true);
  });
});
