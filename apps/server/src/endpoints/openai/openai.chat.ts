import { createRoute, z } from "@hono/zod-openapi";
import {
  chatCompletionParams,
  chatCompletionResponseSchema,
  chatCompletionStreamResponseSchema,
} from "@/types/openai/chatZod";
import type { Context } from "hono";
import { Workflow, hydreateElementTree } from "@aiml/runtime";
import { parseMDXToAIML } from "@aiml/parser";
import { DiagnosticSeverity, type Diagnostic } from "@aiml/shared";

export const RouteConfig = createRoute({
  method: "post",
  path: "/inference/v1/chat/completions",
  request: {
    body: {
      content: {
        "application/json": {
          schema: chatCompletionParams,
        },
      },
    },
  },
  responses: {
    200: {
      description: "OK",
      content: {
        "application/json": {
          schema: chatCompletionResponseSchema.openapi(
            "CreateChatCompletionResponse"
          ),
        },
        "text/event-stream": {
          schema: chatCompletionStreamResponseSchema.openapi(
            "CreateChatCompletionStreamResponse"
          ),
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
            diagnostics: z
              .array(
                z.object({
                  severity: z.enum(["error", "warning"]),
                  message: z.string(),
                  start: z.object({
                    line: z.number(),
                    column: z.number(),
                  }),
                  end: z.object({
                    line: z.number(),
                    column: z.number(),
                  }),
                })
              )
              .optional(),
          }),
        },
      },
      description: "Bad request",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Invalid Authentication or API key",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Country, region, or territory not supported",
    },
    429: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Rate limit reached or quota exceeded",
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Internal server error",
    },
    503: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Server overloaded or service unavailable",
    },
  },
});

export const openaiChat = {
  method: "POST",
  path: "/openai/v1/chat/completions",
  handler: async (c: Context) => {
    const req = await c.req.json();
    const validatedRequest =
      RouteConfig.request.body.content["application/json"].schema.safeParse(
        req
      );

    if (!validatedRequest.success) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const secrets = {
      user: {},
      system: {
        // OPENAI_API_KEY: c.get("user").OPENAI_API_KEY,
        // ANTHROPIC_API_KEY: c.get("user").ANTHROPIC_API_KEY,
        FIREWORKS_API_KEY: c.get("user").apiKey,
      },
    };

    const aimlSystemMessageIndex = validatedRequest.data.messages.findIndex(
      (message) =>
        message.role === "system" && message.content.startsWith("---")
    );
    if (aimlSystemMessageIndex === -1) {
      return c.json(
        {
          error: "No system prompt found containing AIML",
        },
        400
      );
    }

    const aimlPrompt =
      aimlSystemMessageIndex > -1
        ? (validatedRequest.data.messages?.[aimlSystemMessageIndex].content ??
          (
            validatedRequest.data.messages[aimlSystemMessageIndex]
              .content as any
          )?.text)
        : null;

    if (aimlSystemMessageIndex === -1) {
      return c.json({ error: "AIML based system message not found" }, 400);
    }

    if (!aimlPrompt) {
      return c.json(
        {
          error:
            "AIML based system message must have a content property that is a string",
        },
        400
      );
    }

    const cleanRequest = {
      ...validatedRequest.data,
      messages: validatedRequest.data.messages.slice(aimlSystemMessageIndex),
    };

    const userMessage = cleanRequest.messages[cleanRequest.messages.length - 1];
    if (userMessage.role !== "user" && userMessage.role !== "tool") {
      return c.json(
        {
          error: "Last message must be from the user or a tool call response",
        },
        400
      );
    }

    const ast = await parseMDXToAIML(aimlPrompt).catch((error: Error) => {
      c.json(
        {
          error: "Could not parse AIML prompt. Invalid AIML syntax.",
        },
        400
      );
      return null;
    });
    if (!ast) {
      return;
    }

    if (ast.diagnostics.some((d) => d.severity === DiagnosticSeverity.Error)) {
      return c.json(
        {
          error: "AIML system prompt contained errors, and could not be run",
          diagnostics: ast.diagnostics,
        },
        400
      );
    }

    let elementTree: {
      elementTree?: any;
      diagnostics: Set<Diagnostic>;
    };
    try {
      elementTree = hydreateElementTree(ast.nodes, new Set(ast.diagnostics));
    } catch (error) {
      return c.json(
        {
          error:
            "AIML system prompt contained valid syntax, but was an invalid flow. Cause is unknown.",
        },
        400
      );
    }

    const workflow = new Workflow(elementTree.elementTree!, {
      scopedDataModels: ast.datamodel || {},
      fieldValues: ast.datamodel?.fieldValues || {},
    });

    if (!cleanRequest.stream) {
      try {
        const result = await workflow.run({
          userMessage: userMessage.content,
          secrets,
        });
        return c.json(
          result.openaiChatResponse().catch((error: Error) => {
            console.error("error", error);
            return c.json({ error: error.message }, { status: 500 });
          })
        );
      } catch (error) {
        console.error("error", error);
        return c.json({ error: (error as any).message }, { status: 500 });
      }
    }

    try {
      const result = workflow.runStream({
        userMessage: userMessage.content,
        secrets: {
          system: {
            FIREWORKS_API_KEY: process.env.FIREWORK_API_KEY,
            FIREWORKS_BASE_URL: process.env.FIREWORKS_BASE_URL,
          },
        },
        systemMessage: cleanRequest.messages
          .filter((m) => m.role === "system")
          .map((m) => m.content)
          .join("\n\n"),
        chatHistory: cleanRequest.messages.filter((m) => m.role !== "system"),
      });

      return new Response(await result.openaiChatStream(), {
        headers: {
          "Content-Type": "text/event-stream",
          "Transfer-Encoding": "chunked",
        },
      });
    } catch (error) {
      console.error("error", JSON.stringify(error));
      return c.json({ error: (error as any).message }, { status: 500 });
    }
  },
};
