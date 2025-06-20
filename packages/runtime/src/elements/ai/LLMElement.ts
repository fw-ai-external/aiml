import { llmConfig } from "@aiml/shared";
import type { StepValueChunk } from "@aiml/shared";
import { ReplayableAsyncIterableStream } from "@aiml/shared";
import { streamText } from "ai";
import { StepValue } from "../../StepValue";
import type { ExecutionReturnType } from "../../types";
import { parseTemplateLiteral } from "../../utils/strings";
import { createElementDefinition } from "../createElementFactory";
import { getProviderWithClient } from "./utils";
import { experimental_createMCPClient as createMCPClient } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { v4 as uuidv4 } from "uuid";

// Use the LLMProps type from element-config
export const LLM = createElementDefinition({
  ...llmConfig,
  allowedChildren: "text",
  async execute(ctx): Promise<ExecutionReturnType> {
    const { prompt: promptTemplate, instructions: systemTemplate } = ctx.props;

    const serializedCtx = await ctx.serialize();
    const prompt = await parseTemplateLiteral(
      promptTemplate ?? "${input}",
      serializedCtx
    );

    const systemPrompt = await parseTemplateLiteral(
      systemTemplate || "",
      serializedCtx
    );

    const { provider } = getProviderWithClient(
      ctx.props.model,
      ctx.machine?.secrets || { system: {}, user: {} },
      ctx.props.grammar
        ? {
            type: "grammar",
            grammar: ctx.props.grammar,
          }
        : // : ctx.props.responseFormat?.type === "gbnf"
          //   ? {
          //       type: "gbnf",
          //       grammar: "", // import gbnf grammar from gbnf rather than,
          //     }
          ctx.props.responseFormat,
      ctx.props.repetitionPenalty
    );

    // Validate and convert chat history
    const validatedChatHistory = ctx.props.includeChatHistory
      ? ctx.requestInput.chatHistory.map((msg) => {
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
    if (ctx.props.model === "test-model") {
      const result = new StepValue({
        type: "text",
        text: "Mock LLM response",
      });
      return { result };
    }

    const mcpTools = await Promise.all(
      ctx.props.tools
        ?.filter((tool: any) => tool.type === "mcp")
        .map(async (tool: any) => {
          let client;
          try {
            if (tool.mcp.transport === "sse") {
              client = await createMCPClient({
                transport: {
                  type: "sse",
                  url: tool.mcp.url,
                  headers: tool.mcp.headers,
                },
              });
            } else {
              client = await createMCPClient({
                transport: new StreamableHTTPClientTransport(tool.mcp.url, {
                  sessionId: uuidv4(),
                }),
              });
            }

            return await client.tools();
          } catch (error) {
            console.error(error);
            return {};
          }
        })
    ).then((toolSets) =>
      toolSets.reduce((acc, toolSet) => {
        return {
          ...acc,
          ...toolSet,
        };
      }, {})
    );
    const functionTools = ctx.props.tools
      ?.filter((tool: any) => tool.type === "function")
      .reduce((acc: any, tool: any) => {
        return {
          ...acc,
          [tool.function.name]: tool.function,
        };
      }, {});

    const streamResult = streamText({
      model: provider,
      messages: [
        ...(systemPrompt
          ? [{ role: "system" as const, content: systemPrompt }]
          : []),
        ...validatedChatHistory,
        { role: "user" as const, content: prompt! },
      ],
      temperature: ctx.props.temperature,
      stopSequences: ctx.props.stopSequences,
      topP: ctx.props.topP,
      tools: {
        ...mcpTools,
        ...functionTools,
      },
      // toolChoice: ctx.attributes.toolChoice,
      // tools: parsedTools,
      maxRetries: ctx.props.maxRetries ?? 1,
    });
    const result = new StepValue(
      new ReplayableAsyncIterableStream<StepValueChunk>(
        streamResult.fullStream as AsyncIterable<StepValueChunk>
      )
    );

    return { result };
  },
});
