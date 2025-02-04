import {
  APICallError,
  type CoreTool,
  InvalidPromptError,
  generateObject,
  generateText,
  streamObject,
  streamText,
} from "ai";
import { z } from "zod";
import { ValidationError } from "zod-validation-error";
import { ErrorCode } from "./errorCodes";
import {
  type ErrorResult,
  type ObjectStreamPart,
  type APIStreamEvent,
  type StepComplete,
  type TextStreamPart,
  type ToolCallPart,
} from "../types";
import { getCacheForPrompt, setCacheForPrompt } from "./cache";
import { fixJson } from "./fixJson";
import { ReplayableAsyncIterableStream } from "./streams";
import { formatZodError } from "./zod";

function isAPICallError(error: any): boolean {
  return (
    error instanceof Error &&
    error.name === "AI_APICallError" &&
    typeof (error as any).url === "string" &&
    typeof (error as any).requestBodyValues === "object" &&
    ((error as any).statusCode == null ||
      typeof (error as any).statusCode === "number") &&
    ((error as any).responseHeaders == null ||
      typeof (error as any).responseHeaders === "object") &&
    ((error as any).responseBody == null ||
      typeof (error as any).responseBody === "string") &&
    ((error as any).cause == null ||
      typeof (error as any).cause === "object") &&
    typeof (error as any).isRetryable === "boolean" &&
    ((error as any).data == null || typeof (error as any).data === "object")
  );
}

function isNoGenerationError(error: any): boolean {
  return error instanceof Error && error.name === "AI_NoObjectGeneratedError";
}

export async function generateObjectWithCache<OBJECT>(
  args: Omit<Parameters<typeof generateObject>[0], "output"> & {
    output?: "array" | "no-schema" | "object";
    schema: z.Schema<OBJECT, z.ZodTypeDef, any>;
    maxAutoCorrections?: number;
  }
): Promise<Awaited<ReturnType<typeof generateObject>>> {
  let result: Awaited<ReturnType<typeof generateObject>> | null = null;
  let iterations = 0;
  let zodErrors: string[] = [];
  let invalidValue: any;
  const maxIterations = args.maxAutoCorrections || 1;

  while (
    !result &&
    iterations < maxIterations &&
    (iterations === 0 || zodErrors.length > 0)
  ) {
    args.system =
      zodErrors.length > 0
        ? `${
            args.system
          }\n\nThe last attempt to do this resulted in <Previous_Invalid_Value>. This attempt you need try to fix the JSON in <Previous_Invalid_Value>, which does not pass validation of the schema:\n\n<Previous_Invalid_Value>${JSON.stringify(
            invalidValue,
            null,
            2
          )}</Previous_Invalid_Value>


The errors you need to fix are below in <Zod_Errors>.

<Zod_Errors>
${zodErrors?.join("\n\n")}
</Zod_Errors>`
        : args.system;

    if (zodErrors.length > 0) {
      console.log("prompt", prompt);
    }
    if (zodErrors.length > 0) console.log("prompt", prompt);

    result = await _generateObjectWithCache({
      ...args,
      system: args.system,
    })
      .then((result) => {
        zodErrors = [];
        return result;
      })
      .catch((error: any) => {
        console.warn("error", error);
        iterations++;

        if (isAPICallError(error)) {
          throw new Error(error.cause || error.responseBody);
        }

        const errors: ValidationError[] | undefined = error.cause?.issues?.map(
          (issue: any) => formatZodError(issue)
        );

        if (
          errors?.some(
            (err) => err.message && !err.message?.includes("Unknown error")
          )
        ) {
          zodErrors = errors.map((err) => err.message);
          invalidValue = error.value;
          return null;
        } else {
          // zod being overly strict
          return error.value;
        }
      });

    if (
      result ||
      iterations === maxIterations ||
      (typeof result === "object" && result !== null && "error" in result)
    ) {
      break;
    }
  }

  if (
    !result ||
    (typeof result === "object" && result !== null && "error" in result)
  ) {
    throw new Error(
      `Failed after ${maxIterations} attempts to fix JSON errors: ${zodErrors.join(
        "\n\n"
      )}`
    );
  }

  return result;
}

export async function generateTextWithCache<
  TOOLS extends Record<string, CoreTool>,
>(
  args: Parameters<typeof generateText<TOOLS>>[0]
): Promise<Awaited<ReturnType<typeof generateText<TOOLS>>>> {
  const cachedResult = await getCacheForPrompt(args as any);
  if (cachedResult) {
    return JSON.parse(cachedResult);
  }
  const result = await generateText(args).catch((error: any) => {
    if (isAPICallError(error)) {
      console.error("api call error", JSON.stringify(error, null, 2));
      throw new Error(error.cause || error.responseBody);
    }

    throw error;
  });
  await setCacheForPrompt(args as any, result as any);
  return result;
}

async function _generateObjectWithCache<OBJECT>(
  args: Omit<Parameters<typeof generateObject>[0], "output"> & {
    output?: "array" | "no-schema" | "object";
    schema: z.Schema<OBJECT>;
    maxAutoCorrections?: number;
  }
): Promise<Awaited<ReturnType<typeof generateObject>>> {
  const cachedResult = await getCacheForPrompt(args as any);
  try {
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
  } catch (e) {
    console.log("error parsing llm cache", e);
  }
  const result = await generateObject({ ...(args as any) });

  if (result.object) {
    await setCacheForPrompt(args as any, result as any).catch((e) => {
      console.log("error setting cache", e);
    });
  }
  return result as any;
}

export function aiStreamToFireAgentStream(
  stream:
    | Awaited<ReturnType<typeof streamObject>>["fullStream"]
    | Awaited<ReturnType<typeof streamText<any>>>["fullStream"]
): ReplayableAsyncIterableStream<APIStreamEvent> {
  return new ReplayableAsyncIterableStream<APIStreamEvent>(async function* () {
    let buffer: string = "";
    let lastDelta: string | null = null;
    let type: "text" | "object" | "tool-call" | null = null;
    // These are to parse Vercel AI SDK output
    for await (const chunk of stream) {
      switch (chunk.type) {
        case "text-delta":
          if (!type) {
            type = "text";
          }
          buffer += chunk.textDelta;
          lastDelta = chunk.textDelta;

          if (type === "text") {
            yield {
              type: "text-delta",
              delta: chunk.textDelta,
              partial: buffer,
            } as TextStreamPart;
          }
          break;

        case "object":
          if (!type) {
            type = "object";
          }
          yield {
            type: "object-delta",
            partial: (chunk as any).object,
            delta: lastDelta,
          } as ObjectStreamPart;
          break;
        case "tool-call-streaming-start":
          if (!type) {
            type = "tool-call";
          }
          yield {
            type: "tool-call-delta",
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            partial: {},
            delta: "",
          } as ToolCallPart;
          break;
        case "tool-call":
          yield {
            type: "tool-call-delta",
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            partial: fixJson(buffer),
            delta: "",
          } as ToolCallPart;

          break;

        case "tool-call-delta":
          yield {
            type: "tool-call-delta",
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            partial: fixJson(buffer),
            delta: chunk.argsTextDelta,
          } as ToolCallPart;
          break;
        case "tool-result":
          yield {
            type: "tool-call",
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.result,
          } as ToolCallPart;
          break;
        case "finish":
        case "step-finish":
          // 2 tokens is somewhat arbitrary, but it's a minimum that makes sense, we are looking for text
          // generated but never an object
          if (
            type !== "text" &&
            buffer.length === 0 &&
            chunk.finishReason === "stop" &&
            chunk.usage.completionTokens > 2
          ) {
            return yield {
              type: "error",
              error:
                "LLM was not able to generate an object, please try a different model",
            } as ErrorResult;
          }

          switch (type) {
            case "text":
              yield {
                type: "text",
                text: buffer,
              } as TextStreamPart;
              break;
            case "object":
              let object;
              let wasHealed = false;
              try {
                object = JSON.parse(buffer);
              } catch (e) {
                object = fixJson(buffer);
                wasHealed = true;
              }
              yield {
                type: "object",
                object,
                wasHealed,
                raw: buffer,
              } as ObjectStreamPart;
              break;
          }

          return yield {
            type: "step-complete",
            finishReason: chunk.finishReason,
            logprobs: chunk.logprobs,
            usage: chunk.usage,
          } as StepComplete;
        case "error":
          return yield {
            type: "error",
            error: chunk.error,
          } as ErrorResult;
        default:
          return yield {
            type: "error",
            // the Vercel AI SDK changes and adds something we do not yet support
            error: `Unexpected chunk type: ${(chunk as any).type}`,
          } as ErrorResult;
      }
    }
  });
}

export function aiErrorToRunStepError(error: any): ErrorResult {
  if (error instanceof APICallError) {
    switch (error.statusCode) {
      case ErrorCode.SERVER_ERROR:
      case ErrorCode.INCORRECT_API_KEY:
      case ErrorCode.UNSUPPORTED_REGION:
        return {
          type: "error",
          error:
            "The FireAgent inference engine had an unknown error, please try again later.",
          code: ErrorCode.SERVER_ERROR,
        };
      case ErrorCode.ENGINE_OVERLOADED:
      case ErrorCode.QUOTA_EXCEEDED:
        return {
          type: "error",
          error:
            "The FireAgent inference engine is overloaded, please try again later.",
          code: ErrorCode.SERVER_ERROR,
        };
    }
  }

  if (error instanceof InvalidPromptError) {
    return {
      type: "error",
      error: "Invalid prompt",
      code: ErrorCode.SERVER_ERROR,
    };
  }

  return {
    type: "error",
    error: error.message.includes("Last error")
      ? "Error running inference, please try again later."
      : error.message,
    code: ErrorCode.SERVER_ERROR,
  };
}
