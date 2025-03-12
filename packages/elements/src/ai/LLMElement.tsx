import { createElementDefinition } from "@fireworks/shared";
import { llmConfig, LLMProps } from "@fireworks/element-config";
import { StepValue } from "@fireworks/shared";
import { getProviderWithClient } from "./utils";
import { ErrorCode } from "@fireworks/shared";
import { ExecutionGraphElement } from "@fireworks/types";

// Use the LLMProps type from element-config
export const LLM = createElementDefinition<LLMProps>({
  ...llmConfig,
  elementType: "invoke",
  role: "action",
  allowedChildren: "text",
  onExecutionGraphConstruction(buildContext) {
    console.log("=-------------------- onExecutionGraphConstruction llm");
    const llmNode: ExecutionGraphElement = {
      id: buildContext.attributes.id,
      key: buildContext.elementKey,
      type: "action",
      subType: "llm",
      attributes: {
        ...buildContext.attributes,
      },
      next: [],
    };

    buildContext.setCachedGraphElement(
      [buildContext.elementKey, buildContext.attributes.id].filter(Boolean),
      llmNode
    );
    return llmNode;
  },
  async execute(ctx): Promise<StepValue> {
    console.log("=-------------------- llmNode", ctx);

    const {
      model,
      prompt,
      system,
      temperature,
      includeChatHistory,
      stopSequences,
      topP,
      toolChoice,
      tools,
      grammar,
      repetitionPenalty,
      responseFormat,
    } = ctx.attributes;

    try {
      const { client } = getProviderWithClient(
        model,
        ctx.machine.secrets,
        responseFormat,
        repetitionPenalty
      );

      if (!client) {
        throw new Error("OpenAI client not available for this model");
      }

      const messages = [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user" as const, content: prompt },
      ];

      const response = await client.chat.completions.create({
        model,
        messages,
        temperature,
        stop: stopSequences,
        top_p: topP,
        tool_choice: toolChoice as any,
        tools,
        response_format: responseFormat && {
          type: responseFormat.type === "json" ? "json_object" : "text",
        },
      });

      const message = response.choices[0].message;
      return new StepValue({
        type: "object",
        object: {
          role: message.role,
          content: message.content,
          ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
          ...(message.function_call
            ? { function_call: message.function_call }
            : {}),
        },
        raw: JSON.stringify(response),
      });
    } catch (error) {
      console.error("Error calling LLM:", error);
      return new StepValue({
        type: "error",
        code: ErrorCode.SERVER_ERROR,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
