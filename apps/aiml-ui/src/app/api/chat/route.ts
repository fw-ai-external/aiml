import { createFireworks } from "@ai-sdk/fireworks";
import { streamText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const fireworks = createFireworks({
    apiKey: process.env.FIREWORK_API_KEY,
  });
  const result = streamText({
    model: fireworks("accounts/fireworks/models/deepseek-v3") as any,
    messages,
  });
  return result.toDataStreamResponse();
}
