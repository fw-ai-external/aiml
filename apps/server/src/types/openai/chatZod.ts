import { z } from "zod";

// Shared schemas
const functionParametersSchema = z.record(z.unknown());

const functionDefinitionSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/, {
    message:
      "Function name must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64",
  }),
  description: z.string().optional(),
  parameters: functionParametersSchema.optional(),
});

// Content part schemas
const contentPartTextSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const imageUrlSchema = z.object({
  url: z.string(),
  detail: z.enum(["auto", "low", "high"]).optional(),
});

const contentPartImageSchema = z.object({
  type: z.literal("image_url"),
  image_url: imageUrlSchema,
});

const contentPartSchema = z.discriminatedUnion("type", [
  contentPartTextSchema,
  contentPartImageSchema,
]);

// Message schemas
const systemMessageSchema = z.object({
  role: z.literal("system"),
  content: z.string(),
  name: z.string().optional(),
});

const userMessageSchema = z.object({
  role: z.literal("user"),
  content: z.union([z.string(), z.array(contentPartSchema)]),
  name: z.string().optional(),
});

const functionCallSchema = z.object({
  name: z.string(),
  arguments: z.string(),
});

const toolCallFunctionSchema = z.object({
  name: z.string(),
  arguments: z.string(),
});

const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: toolCallFunctionSchema,
});

const assistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().nullable().optional(),
  function_call: functionCallSchema.optional(),
  name: z.string().optional(),
  tool_calls: z.array(toolCallSchema).optional(),
});

const toolMessageSchema = z.object({
  role: z.literal("tool"),
  content: z.string(),
  tool_call_id: z.string(),
});

const functionMessageSchema = z.object({
  role: z.literal("function"),
  content: z.string().nullable(),
  name: z.string(),
});

const messageSchema = z.discriminatedUnion("role", [
  systemMessageSchema,
  userMessageSchema,
  assistantMessageSchema,
  toolMessageSchema,
  functionMessageSchema,
]);

// Tool schemas
const toolSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("function"),
    function: functionDefinitionSchema,
  }),
  z.object({
    type: z.literal("mcp"),
    mcp: z.object({
      transport: z.union([z.literal("sse"), z.literal("streamable-http")]),
      url: z.string().url(),
      headers: z.record(z.string(), z.string()).optional(),
    }),
  }),
]);

// Tool choice schemas
const namedToolChoiceSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
  }),
});

const toolChoiceSchema = z.union([
  z.literal("none"),
  z.literal("auto"),
  namedToolChoiceSchema,
]);

// Response format schema
const responseFormatSchema = z.object({
  type: z.enum(["text", "json_object"]).optional(),
});

// Web search options schema
const webSearchOptionsSchema = z.object({}).optional();

// Audio schema
const audioSchema = z.object({}).nullable().optional();

// Stream options schema
const streamOptionsSchema = z.object({}).nullable().optional();

// Prediction schema
const predictionSchema = z
  .union([
    z.object({
      content: z.string(),
    }),
    z.object({
      content: z.string(),
      file_path: z.string(),
    }),
  ])
  .optional();

// Main chat completion params schema
export const chatCompletionParamsSchema = z.object({
  messages: z.array(messageSchema),
  model: z.string().optional(),
  frequency_penalty: z.number().min(-2).max(2).nullable().optional().default(0),
  function_call: z
    .union([
      z.literal("none"),
      z.literal("auto"),
      z.object({ name: z.string() }),
    ])
    .optional(),
  functions: z.array(functionDefinitionSchema).optional(),
  logit_bias: z.record(z.number()).nullable().optional(),
  logprobs: z.boolean().nullable().optional().default(false),
  max_completion_tokens: z.number().int().positive().nullable().optional(),
  max_tokens: z.number().int().positive().nullable().optional(),
  metadata: z.record(z.string().max(512)).optional(),
  modalities: z
    .array(z.enum(["text", "audio"]))
    .nullable()
    .optional(),
  n: z.number().int().positive().nullable().optional().default(1),
  parallel_tool_calls: z.boolean().optional().default(true),
  prediction: predictionSchema,
  presence_penalty: z.number().min(-2).max(2).nullable().optional().default(0),
  reasoning_effort: z
    .enum(["low", "medium", "high"])
    .nullable()
    .optional()
    .default("medium"),
  response_format: responseFormatSchema.optional(),
  seed: z.number().int().nullable().optional(),
  service_tier: z
    .enum(["auto", "default", "flex"])
    .nullable()
    .optional()
    .default("auto"),
  stop: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  store: z.boolean().nullable().optional().default(false),
  stream: z.boolean().nullable().optional().default(false),
  stream_options: streamOptionsSchema,
  temperature: z.number().min(0).max(2).nullable().optional().default(1),
  tool_choice: toolChoiceSchema.optional(),
  tools: z.array(toolSchema).optional(),
  top_logprobs: z.number().int().min(0).max(20).nullable().optional(),
  top_p: z.number().min(0).max(1).nullable().optional().default(1),
  user: z.string().optional(),
  web_search_options: webSearchOptionsSchema,
});

// Streaming specific schema
export const streamingChatCompletionParamsSchema =
  chatCompletionParamsSchema.extend({
    stream: z.literal(true),
  });

// Non-streaming specific schema
export const nonStreamingChatCompletionParamsSchema =
  chatCompletionParamsSchema.extend({
    stream: z.union([z.literal(false), z.null()]).optional(),
  });

export const chatCompletionParams = z.union([
  streamingChatCompletionParamsSchema,
  nonStreamingChatCompletionParamsSchema,
]);

export type ChatCompletionParams = z.infer<typeof chatCompletionParams>;

// Chat completion response schemas

// Message schema for assistant response in chat completion
const chatCompletionMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().nullable(),
  refusal: z.string().nullable().optional(),
  annotations: z.array(z.any()).optional(),
});

// Prompt tokens details schema
const promptTokensDetailsSchema = z.object({
  cached_tokens: z.number().int().optional(),
  audio_tokens: z.number().int().optional(),
});

// Completion tokens details schema
const completionTokensDetailsSchema = z.object({
  reasoning_tokens: z.number().int().optional(),
  audio_tokens: z.number().int().optional(),
  accepted_prediction_tokens: z.number().int().optional(),
  rejected_prediction_tokens: z.number().int().optional(),
});

// Usage schema for chat completion
const chatCompletionUsageSchema = z.object({
  prompt_tokens: z.number().int(),
  completion_tokens: z.number().int(),
  total_tokens: z.number().int(),
  prompt_tokens_details: promptTokensDetailsSchema.optional(),
  completion_tokens_details: completionTokensDetailsSchema.optional(),
});

// Choice schema for chat completion
const chatCompletionChoiceSchema = z.object({
  index: z.number().int(),
  message: chatCompletionMessageSchema,
  logprobs: z.any().nullable(),
  finish_reason: z.string(),
});

// The chat completion response object schema
export const chatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number().int(),
  model: z.string(),
  choices: z.array(chatCompletionChoiceSchema),
  usage: chatCompletionUsageSchema,
  service_tier: z.string().nullable().optional(),
  system_fingerprint: z.string().optional(),
});

// The chat completion list response object schema
export const chatCompletionListResponseSchema = z.object({
  object: z.literal("list"),
  data: z.array(chatCompletionResponseSchema),
  first_id: z.string(),
  has_more: z.boolean(),
  last_id: z.string(),
});

// Delta schema for streaming chat completion
const chatCompletionStreamResponseDeltaSchema = z.object({
  role: z.literal("assistant").optional(),
  content: z.string().optional(),
  function_call: functionCallSchema.optional(),
  tool_calls: z.array(toolCallSchema).optional(),
});

// Token logprob schema for streaming chat completion
const chatCompletionTokenLogprobSchema = z.object({
  token: z.string(),
  logprob: z.number(),
  bytes: z.array(z.number().int()).optional(),
  top_logprobs: z.array(z.record(z.number())).optional(),
});

// Choice schema for streaming chat completion
const chatCompletionStreamChoiceSchema = z.object({
  index: z.number().int(),
  delta: chatCompletionStreamResponseDeltaSchema,
  logprobs: z
    .object({
      content: z.array(chatCompletionTokenLogprobSchema).nullable().optional(),
      refusal: z.array(chatCompletionTokenLogprobSchema).nullable().optional(),
    })
    .nullable()
    .optional(),
  finish_reason: z
    .enum(["stop", "length", "tool_calls", "content_filter", "function_call"])
    .nullable(),
});

// The streaming chat completion response object schema
export const chatCompletionStreamResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion.chunk"),
  created: z.number().int(),
  model: z.string(),
  choices: z.array(chatCompletionStreamChoiceSchema),
  system_fingerprint: z.string().optional(),
  service_tier: z.enum(["scale", "default"]).nullable().optional(),
  usage: chatCompletionUsageSchema.nullable().optional(),
});

export type ChatCompletionResponse = z.infer<
  typeof chatCompletionResponseSchema
>;
export type ChatCompletionListResponse = z.infer<
  typeof chatCompletionListResponseSchema
>;
export type ChatCompletionStreamResponse = z.infer<
  typeof chatCompletionStreamResponseSchema
>;
