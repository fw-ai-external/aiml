import { createFireworks } from "@ai-sdk/fireworks";
import { streamText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, workflowId } = await req.json();
  console.log("workflowId", workflowId);
  console.log("messages", messages);

  const fireworks = createFireworks({
    apiKey: process.env.FIREWORK_API_KEY,
    fetch: (url, options) => {
      console.log("fetching", url);
      return fetch(url, options);
    },
  });

  const result = streamText({
    model: fireworks("accounts/fireworks/models/deepseek-r1"),
    messages,
  });

  return result.toDataStreamResponse();
}
