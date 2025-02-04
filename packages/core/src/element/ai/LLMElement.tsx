import { z } from "zod";
import { streamText, tool } from "ai";
import { createElementDefinition } from "../createElementDefinition";
import type { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";
import { aiStreamToFireAgentStream } from "../../utils/ai";
import { getProviderWithClient } from "../../utils/llm/provider";
import { gbnf } from "../../utils/llm/grammar/grammar";

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
      type: z.enum(["json", "text", "gbnf"]),
      schema: z.record(z.any()).optional(),
    })
    .optional(),
});

export const LLM = createElementDefinition({
  tag: "llm",
  propsSchema: llmSchema,
  allowedChildren: "none",

  async execute(
    ctx: StepContext<z.infer<typeof llmSchema>>
  ): Promise<StepValue> {
    const { system, prompt, includeChatHistory = false } = ctx.attributes;

    let chatHistory = includeChatHistory ? ctx.workflowInput.chatHistory : [];
    try {
      const { provider, client } = getProviderWithClient(
        ctx.attributes.model,
        ctx.machine.secrets,
        ctx.attributes.grammar
          ? {
              type: "grammar",
              grammar: ctx.attributes.grammar,
            }
          : ctx.attributes.responseFormat?.type === "gbnf"
            ? {
                type: "gbnf",
                grammar: gbnf,
              }
            : ctx.attributes.responseFormat,
        ctx.attributes.repetitionPenalty
      );

      const parsedTools = ctx.attributes.tools?.reduce(
        (acc, t) => {
          acc[t.name] =
            "execute" in t && typeof t.execute === "function"
              ? tool({
                  description: t.description,
                  parameters: (t.parameters as any) ?? z.object({}),
                  execute: async (
                    args: any,
                    options: { abortSignal?: AbortSignal }
                  ) => {
                    const execute = t.execute as (
                      args: any,
                      options: { abortSignal?: AbortSignal }
                    ) => Promise<any>;
                    return await execute(args, options);
                  },
                })
              : tool({
                  description: t.description,
                  parameters: (t.parameters as any) ?? z.object({}),
                  execute: async (args: any) => args,
                });
          return acc;
        },
        {} as Record<string, any>
      );

      const result = await streamText({
        model: provider,
        messages: [
          ...(system ? [{ role: "system" as const, content: system }] : []),
          ...chatHistory,
          { role: "user" as const, content: prompt },
        ],
        temperature: ctx.attributes.temperature,
        stopSequences: ctx.attributes.stopSequences,
        topP: ctx.attributes.topP,
        toolChoice: ctx.attributes.toolChoice as any,
        tools: parsedTools,
        maxRetries: 1,
      });

      if (!result) {
        return new StepValue({
          type: "error",
          error: `No response from AI!`,
        });
      }
      const value = new StepValue(aiStreamToFireAgentStream(result.fullStream));
      return value;
    } catch (error) {
      console.error("Error in LLM element:", error);
      throw error;
    }
  },
});
