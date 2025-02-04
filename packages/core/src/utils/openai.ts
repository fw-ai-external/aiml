import type {
  CoreAssistantMessage,
  CoreToolMessage,
  CoreUserMessage,
} from "ai";
import type {} from "openai";
import type { RunstepOutput } from "../types";
import { ChatCompletionMessageParam } from "../types/openai/chat";

export function convertFromOpenAIMessages(
  messages: ChatCompletionMessageParam[]
): {
  messages: Array<CoreUserMessage | CoreAssistantMessage | CoreToolMessage>;
  systemPrompt?: string;
  userInput?: RunstepOutput | RunstepOutput[];
} {
  const systemMessage = messages.find((m) => m.role === "system")
    ?.content as string;

  // Identify the last user message, if any
  const reversedIndex = [...messages]
    .reverse()
    .findIndex((m) => m.role === "user");
  let lastUserMessage: ChatCompletionMessageParam | undefined;
  let userInput: RunstepOutput | RunstepOutput[] | undefined;
  if (reversedIndex !== -1) {
    const lastUserMessageIndex = messages.length - 1 - reversedIndex;
    lastUserMessage = messages[lastUserMessageIndex];

    if (typeof lastUserMessage?.content === "string") {
      userInput = {
        type: "text",
        text: lastUserMessage.content,
      };
    } else if (Array.isArray(lastUserMessage?.content)) {
      userInput = lastUserMessage?.content.map((c) => {
        if (c.type === "image_url") {
          return {
            type: "image_url",
            image_url: c.image_url,
          };
        }
        return {
          type: "text",
          text: c.text,
        };
      }) as RunstepOutput[];
    }
  }

  // Convert all non-system and non-last-user messages
  const convertedMessages: Array<
    CoreUserMessage | CoreAssistantMessage | CoreToolMessage
  > = messages
    .filter((m) => m !== lastUserMessage && m.role !== "system")
    .map((m) => {
      if (m.role === "user") {
        return {
          role: "user",
          content: m.content,
        };
      }
      if (m.role === "assistant") {
        if (m.tool_calls) {
          return {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: m.tool_calls[0]?.id,
                toolName: m.tool_calls[0]?.function.name,
                args: JSON.parse(m.tool_calls[0]?.function.arguments ?? "{}"),
              },
            ],
          };
        }
        return {
          role: "assistant",
          content: m.content,
        };
      }
      if (m.role === "tool") {
        if (typeof m.content === "string") {
          return {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: m.tool_call_id ?? "",
                toolName: (m as any).name ?? "",
                result: m.content,
              },
            ],
          };
        } else {
          return {
            role: "tool",
            content: m.content,
          };
        }
      }
      // For unrecognized roles, do nothing
      return undefined;
    })
    .filter(Boolean) as Array<
    CoreUserMessage | CoreAssistantMessage | CoreToolMessage
  >;

  return {
    messages: convertedMessages,
    systemPrompt: systemMessage,
    userInput: userInput || { type: "text", text: "" },
  };
}
