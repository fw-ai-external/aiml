import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import OpenAI from "openai";
import { Secrets } from "@fireworks/types";
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
  secrets: Secrets,
  response_format: {
    type: string;
    grammar?: string;
    schema?: Record<string, unknown>;
  } | null = null,
  repetitionPenalty: number | undefined = undefined,
  extra_headers?: Record<string, string>
): { provider: LanguageModelV1; client: OpenAI | null } {
  const cerebrasModels = ["llama3.1-8b", "llama3.1-70b"];
  const openaiModels = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-0612",
    "o1-preview",
    "o1-mini",
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
      secrets.system.FIREWORKS_BASE_URL ??
      "https://api.fireworks.ai/inference/v1";
    provider = createOpenAI({
      apiKey: secrets.system.FIREWORKS_API_KEY ?? "",
      baseURL,
      ...(extra_headers ? { headers: extra_headers } : {}),
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
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
          const modifiedInit = {
            ...init,
            body: JSON.stringify(originalRequest),
          };
          return fetch(input, modifiedInit);
        } else {
          const response = await fetch(input, init);

          return response;
        }
      },
    });
    client = new OpenAI({
      apiKey: secrets.system.FIREWORKS_API_KEY ?? "",
      baseURL,
      ...(extra_headers ? { defaultHeaders: extra_headers } : {}),
    });
  }

  return { provider: provider(model), client };
}
