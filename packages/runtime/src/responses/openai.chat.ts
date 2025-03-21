import {
  OpenAIChatCompletion,
  OpenAIChatCompletionChunk,
  StepValueResult,
  StepValueChunk,
} from "@fireworks/shared";
import { type ChatCompletionMessage } from "openai/resources/chat/completions";

// Map a StepValueResult to an OpenAIChatCompletion type
export function stepValueResultToOpenAIChatCompletion(
  response: StepValueResult
): OpenAIChatCompletion | null {
  if (!response) return null;

  const content = "text" in response && response.text ? response.text : null;
  const toolCalls = response.toolCalls?.map((toolCall) => ({
    id: toolCall.toolCallId || `call_${Date.now()}`,
    type: "function" as const,
    function: {
      name: toolCall.toolName,
      arguments:
        typeof toolCall.args === "string"
          ? toolCall.args
          : JSON.stringify(toolCall.args),
    },
  }));

  const message: Omit<ChatCompletionMessage, "refusal"> & { refusal: null } = {
    role: "assistant",
    content,
    tool_calls: toolCalls,
    refusal: null, // Required property in type definition
  };

  return {
    id: `chatcmpl_${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "unknown", // StepValueResult doesn't contain model info
    choices: [
      {
        index: 0,
        message, // Type assertion to avoid complex type issues
        finish_reason: "stop", // StepValueResult doesn't contain finishReason
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

export async function* stepValueChunkToOpenAIChatCompletionChunk(
  chunks: AsyncIterableIterator<StepValueChunk>
): AsyncGenerator<OpenAIChatCompletionChunk> {
  const id = `chatcmpl_${Date.now()}`;

  for await (const chunk of chunks) {
    let contentValue: string | null = null;
    if (chunk.type === "text-delta" && "textDelta" in chunk) {
      contentValue = chunk.textDelta as string;
    } else if (chunk.type === "reasoning" && "reasoning" in chunk) {
      contentValue = chunk.reasoning as string;
    } else if (chunk.type === "tool-call" && "toolCall" in chunk) {
      contentValue = chunk.toolCall as string;
    }

    if (contentValue) {
      const choice = {
        index: 0,
        delta: {
          content: contentValue as string, // Ensure content is typed as string
          role: "assistant" as const,
        },
        finish_reason: null,
      };

      const chatCompletionChunk: OpenAIChatCompletionChunk = {
        id,
        choices: [choice],
        created: Math.floor(Date.now() / 1000),
        model: "--",
        object: "chat.completion.chunk",
      };

      yield chatCompletionChunk;
    }

    // Handle finish reason if available
    if (chunk.type === "finish") {
      const choice = {
        index: 0,
        delta: {}, // Empty delta
        finish_reason: "stop" as const,
      };

      const chatCompletionChunk: OpenAIChatCompletionChunk = {
        id,
        choices: [choice],
        created: Math.floor(Date.now() / 1000),
        model: "--",
        object: "chat.completion.chunk",
      };

      return chatCompletionChunk;
    }
  }
}
