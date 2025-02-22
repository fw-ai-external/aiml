import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import { llmConfig } from "@fireworks/element-config";
import { StepValue } from "../../runtime/StepValue";
import { getProviderWithClient } from "../../utils/llm/provider";
import { ErrorCode } from "../../utils/errorCodes";

const llmSchema = z.object({
  id: z.string().optional(),
  model: z.string(),
  system: z.string().optional(),
  prompt: z.string(),
  temperature: z.number().optional(),
  includeChatHistory: z.boolean().optional(),
  stopSequences: z.array(z.string()).optional(),
  topP: z.number().optional(),
  toolChoice: z.string().optional(),
  tools: z.array(z.any()).optional(),
  grammar: z.string().optional(),
  repetitionPenalty: z.number().optional(),
  responseFormat: z
    .object({
      type: z.enum(["json", "text"]),
      schema: z.record(z.any()).optional(),
    })
    .optional(),
});

export const LLM = createElementDefinition<z.infer<typeof llmSchema>>({
  ...llmConfig,
  elementType: "invoke",
  role: "action",
  allowedChildren: "text",
  async execute(ctx): Promise<StepValue> {
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
