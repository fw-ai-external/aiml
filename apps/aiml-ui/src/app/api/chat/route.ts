import { createFireworks } from "@ai-sdk/fireworks";
import { streamText } from "ai";
import { Runtime, astToRunnableBaseElementTree } from "@fireworks/core";
import fs from "node:fs";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, workflowId } = await req.json();
  console.log("workflowId", workflowId);
  console.log("messages", messages);

  let persistedWorkflow;
  try {
    const fileContent = fs.readFileSync(
      `./.workflows/${workflowId}.json`,
      "utf8"
    );
    persistedWorkflow = JSON.parse(fileContent);
  } catch (error) {
    console.error(
      `Error reading workflow file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    // Continue with empty workflow object
  }
  const elementTree = astToRunnableBaseElementTree(persistedWorkflow.ast);
  const workflow = new Runtime(elementTree as any);

  const result = workflow.runStream({
    userMessage: messages[messages.length - 1].content,
  });

  // const fireworks = createFireworks({
  //   apiKey: process.env.FIREWORK_API_KEY,
  //   fetch: (url, options) => {
  //     console.log("fetching", url);
  //     return fetch(url, options);
  //   },
  // });

  // const result = streamText({
  //   model: fireworks("accounts/fireworks/models/deepseek-r1"),
  //   messages,
  // });

  result;

  return result.toDataStreamResponse();
}
