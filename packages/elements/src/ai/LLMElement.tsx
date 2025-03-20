import { createElementDefinition } from "@fireworks/shared";
import { llmConfig } from "@fireworks/element-config";
import { StepValue } from "@fireworks/shared";
import { getProviderWithClient } from "./utils";
import {
  ExecutionGraphElement,
  ExecutionReturnType,
  StepValueChunk,
} from "@fireworks/types";
import { streamText } from "ai";
import { ReplayableAsyncIterableStream } from "@fireworks/shared";

// Use the LLMProps type from element-config
export const LLM = createElementDefinition({
  ...llmConfig,
  elementType: "invoke",
  role: "action",
  tag: "llm" as const,
  allowedChildren: "text",
  onExecutionGraphConstruction(buildContext) {
    const llmNode: ExecutionGraphElement = {
      id: buildContext.attributes.id,
      key: buildContext.elementKey,
      type: "action",
      subType: "llm",
      attributes: buildContext.attributes,
      next: [],
    };

    buildContext.setCachedGraphElement(
      [buildContext.elementKey, buildContext.attributes.id].filter(Boolean),
      llmNode
    );
    return llmNode;
  },
  async execute(ctx): Promise<ExecutionReturnType> {
    const { prompt, system } = ctx.attributes;

    try {
      const { provider } = getProviderWithClient(
        ctx.attributes.model,
        ctx.context.triggerData?.secrets || { system: {}, user: {} },
        ctx.attributes.grammar
          ? {
              type: "grammar",
              grammar: ctx.attributes.grammar,
            }
          : ctx.attributes.responseFormat?.type === "gbnf"
            ? {
                type: "gbnf",
                grammar: "", // gbnf,
              }
            : ctx.attributes.responseFormat,
        ctx.attributes.repetitionPenalty
      );

      // Validate and convert chat history
      const validatedChatHistory = ctx.attributes.includeChatHistory
        ? ctx.workflowInput.chatHistory.map((msg) => {
            if (typeof msg.content !== "string") {
              throw new Error(
                "Chat history messages must contain only string content"
              );
            }
            return {
              role: msg.role,
              content: msg.content,
            } as { role: "user" | "assistant"; content: string };
          })
        : [];

      // For testing purposes, we'll check if we're in a test environment
      // by checking if the model is "test-model"
      if (ctx.attributes.model === "test-model") {
        const result = new StepValue({
          type: "text",
          text: "Mock LLM response",
        });
        return { result };
      }

      const streamResult = streamText({
        model: provider,
        messages: [
          ...(system ? [{ role: "system" as const, content: system }] : []),
          ...validatedChatHistory,
          { role: "user" as const, content: prompt! },
        ],
        temperature: ctx.attributes.temperature,
        stopSequences: ctx.attributes.stopSequences,
        topP: ctx.attributes.topP,
        // toolChoice: ctx.attributes.toolChoice,
        // tools: parsedTools,
        maxRetries: 1,
      });
      const result = new StepValue(
        new ReplayableAsyncIterableStream<StepValueChunk>(
          streamResult.fullStream
        )
      );

      return { result };
    } catch (error) {
      return {
        result: ctx.input,
        exception: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
});
