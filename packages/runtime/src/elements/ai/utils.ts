import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import type { Secrets } from "@aiml/shared";
import OpenAI from "openai";
import { fsCacheMiddleware } from "./fsCache";
import { wrapLanguageModel } from "ai";

export function getProvider(
  model: string = "accounts/fireworks/models/llama-v3p1-8b-instruct",
  secrets: Secrets,
  response_format: {
    type: string;
    grammar?: string;
    schema?: Record<string, unknown>;
  } | null = null,
  repetitionPenalty: number | undefined = undefined
): LanguageModelV1 {
  const { provider } = getProviderWithClient(
    model,
    secrets,
    response_format,
    repetitionPenalty
  );
  return provider;
}

export function getProviderWithClient(
  model: string = "accounts/fireworks/models/llama-v3p1-8b-instruct",
  secrets: Secrets = { system: {}, user: {} },
  response_format: {
    type: string;
    grammar?: string;
    schema?: Record<string, unknown>;
  } | null = null,
  repetitionPenalty: number | undefined = undefined,
  extra_headers?: Record<string, string>
): { provider: LanguageModelV1; client: OpenAI | null } {
  // Ensure secrets.system exists to prevent undefined errors
  if (!secrets) secrets = { system: {}, user: {} };
  if (!secrets.system) secrets.system = {};
  const cerebrasModels = ["llama3.1-8b", "llama3.1-70b"];
  const openaiModels = [
    "gpt-4o",
    "gpt-4o-mini",
    "o1-preview",
    "o1-mini",
    "o3-mini",
    "o3-preview",
    "o4-mini",
    "o4-preview",
  ];
  const anthropicModels = ["claude-3-5-sonnet-20240620"];

  let provider;
  let client: OpenAI | null = null;

  if (cerebrasModels.includes(model)) {
    provider = createOpenAI({
      apiKey: secrets.system.CEREBRAS_API_KEY ?? "",
      baseURL: "https://api.cerebras.ai/v1",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "NodeJS/20.0",
        ...extra_headers,
      },
    });
    client = new OpenAI({
      apiKey: secrets.system.CEREBRAS_API_KEY ?? "",
      baseURL: "https://api.cerebras.ai/v1",
      ...(extra_headers ? { defaultHeaders: extra_headers } : {}),
    });
  } else if (openaiModels.includes(model)) {
    provider = createOpenAI({
      apiKey: secrets.system.OPENAI_API_KEY ?? "",
      ...(extra_headers ? { headers: extra_headers } : {}),
    });
    client = new OpenAI({
      apiKey: secrets.system.OPENAI_API_KEY ?? "",
      ...(extra_headers ? { defaultHeaders: extra_headers } : {}),
    });
  } else if (anthropicModels.includes(model)) {
    provider = createAnthropic({
      apiKey: secrets.system.ANTHROPIC_API_KEY ?? "",
      ...(extra_headers ? { headers: extra_headers } : {}),
    });
    // Anthropic doesn't use OpenAI client
  } else {
    const baseURL =
      secrets?.system?.FIREWORKS_BASE_URL ??
      "https://api.fireworks.ai/inference/v1";

    // Define the fetch wrapper function
    const customFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      let modifiedInit = init;
      if (response_format || repetitionPenalty !== undefined) {
        const originalRequest = init?.body
          ? JSON.parse(init.body as string)
          : {};
        if (response_format) {
          originalRequest.response_format = response_format;
        }
        if (repetitionPenalty !== undefined) {
          originalRequest.repetition_penalty = repetitionPenalty;
        }
        modifiedInit = {
          ...init,
          body: JSON.stringify(originalRequest),
        };
      }
      // Call the original fetch
      return fetch(input, modifiedInit);
    };

    // Assign static properties from global fetch to custom fetch to match the type
    Object.assign(customFetch, fetch);

    provider = createOpenAI({
      apiKey: secrets?.system?.FIREWORKS_API_KEY ?? "",
      baseURL,
      ...(extra_headers ? { headers: extra_headers } : {}),
      fetch: customFetch as typeof fetch, // Use the wrapper, casting to satisfy TS initially
    });
    client = new OpenAI({
      apiKey: secrets.system.FIREWORKS_API_KEY ?? "",
      baseURL,
      ...(extra_headers ? { defaultHeaders: extra_headers } : {}),
    });
  }

  // Type assertion to handle incompatible types between different versions of @ai-sdk/provider
  return {
    provider:
      process.env.NODE_ENV === "test"
        ? wrapLanguageModel({
            model: provider(model) as LanguageModelV1,
            middleware: fsCacheMiddleware as any,
          })
        : (provider(model) as LanguageModelV1),
    client,
  };
}
