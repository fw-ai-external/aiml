import type { JSONSchemaArray, JSONSchemaObject } from "openai/lib/jsonschema";
import { z } from "zod";
import type { StepContext } from "../runtime/StepContext";
import { ErrorCode } from "../utils/errorCodes";
import type { ReplayableAsyncIterableStream } from "../utils/streams";

export type SystemVariables = {
  accountId: string;
  developerEmail: string;
  accountType: string;
  fireworksPlayground?: string;
};
export type JSCode = string;

/**
Create a type from an object with all keys and nested keys set to optional.
The helper supports normal objects and Zod schemas (which are resolved automatically).
It always recurses into arrays.

Adopted from [type-fest](https://github.com/sindresorhus/type-fest/tree/main) PartialDeep.
 */
type DeepPartial<T> = T extends
  | null
  | undefined
  | string
  | number
  | boolean
  | symbol
  | bigint
  | void
  | Date
  | RegExp
  | ((...arguments_: any[]) => unknown)
  | (new (...arguments_: any[]) => unknown)
  ? T
  : T extends Map<infer KeyType, infer ValueType>
    ? PartialMap<KeyType, ValueType>
    : T extends Set<infer ItemType>
      ? PartialSet<ItemType>
      : T extends ReadonlyMap<infer KeyType, infer ValueType>
        ? PartialReadonlyMap<KeyType, ValueType>
        : T extends ReadonlySet<infer ItemType>
          ? PartialReadonlySet<ItemType>
          : T extends z.Schema<any>
            ? DeepPartial<T["_type"]>
            : T extends object
              ? T extends ReadonlyArray<infer ItemType>
                ? ItemType[] extends T
                  ? readonly ItemType[] extends T
                    ? ReadonlyArray<DeepPartial<ItemType | undefined>>
                    : Array<DeepPartial<ItemType | undefined>>
                  : PartialObject<T>
                : PartialObject<T>
              : unknown;
type PartialMap<KeyType, ValueType> = {} & Map<
  DeepPartial<KeyType>,
  DeepPartial<ValueType>
>;
type PartialSet<T> = {} & Set<DeepPartial<T>>;
type PartialReadonlyMap<KeyType, ValueType> = {} & ReadonlyMap<
  DeepPartial<KeyType>,
  DeepPartial<ValueType>
>;
type PartialReadonlySet<T> = {} & ReadonlySet<DeepPartial<T>>;
type PartialObject<ObjectType extends object> = {
  [KeyType in keyof ObjectType]?: DeepPartial<ObjectType[KeyType]>;
};

/**
 * Type helpers
 */
type ValueOf<
  ObjectType,
  ValueType extends keyof ObjectType = keyof ObjectType,
> = ObjectType[ValueType];

/**
 * JSON Types
 * Used to type unknown JSON values but ensure that the values are compatible with serializing and deserializing to JSON.
 */

export type JSON = { [key: string]: JSONValues } | JSONValues[];
export type JSONValues =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValues }
  | JSONValues[];
export type JSONSchema = JSONSchemaObject | JSONSchemaArray;
export type Primitives = string | number | boolean | null;
export type JSONObject = { [key: string]: Primitives | JSONValue };
export type JSONArray = Primitives[] | JSONObject[];
export type JSONValue = JSONArray | JSONObject;

/**
 * ObjectWithSchema type
 * A record that takes a JSONObject and is typed by it
 */
export type ObjectWithSchema<Schema extends JSONSchemaObject> = {
  [K in keyof Schema]: Schema[K] extends JSONSchemaObject
    ? ObjectWithSchema<Schema[K] & JSONObject>
    : Schema[K] extends JSONSchemaObject
      ? ObjectWithSchema<Schema[K] & JSONObject>
      : Schema[K] extends JSONSchemaArray
        ? ObjectWithSchema<Schema[K][number] & JSONObject>[]
        : Schema[K];
};

/**
 * State machine types
 * Used to define the state machines libraries internal types.
 *
 * TODO: should be moved to its own file and avoid exporting these types outside of the library.
 */

export type RunStepInput = string | JSONObject | RunstepOutput | RunStepStream;

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}
/**
 * Value / Return types used between states and used in the API to return values from states.
 */

export const BaseRunStepOuputSchema = z.object({
  type: z.string(),
});
export const ErrorResultSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("error"),
  error: z.string(),
  step: z.string().optional(),
  code: z.nativeEnum(ErrorCode),
});

export type ErrorResult = z.infer<typeof ErrorResultSchema>;

export type StepComplete = {
  type: "step-complete";
  finishReason: FinishReason;
  logprobs?: LogProbs;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export const FilesSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("files"),
  files: z.array(
    z.object({
      type: z.enum(["pdf", "image", "text", "audio", "video"]),
      format: z.enum(["base64", "binary", "url"]),
    })
  ),
});
export type Files = z.infer<typeof FilesSchema>;

export const GeneratedObjectSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("object"),
  object: z
    .union([z.record(z.unknown()), z.array(z.record(z.unknown()))])
    .describe(
      "The full object once the stream is finished. If the stream ended prematurely, the object will be healed to be valid but it might be incomplete."
    ),
  wasHealed: z
    .boolean()
    .optional()
    .describe("Whether the object was healed or not."),
  raw: z
    .string()
    .describe(
      "The full generation from the start of the object until done. Might be incomplete if generation ended prematurely."
    ),
});

export type GeneratedObject<T extends any = Record<string, unknown>> = z.infer<
  typeof GeneratedObjectSchema
> & {
  object: T;
};

export type ObjectStreamPart<T extends JSONObject | JSONObject[] = JSONObject> =

    | {
        type: "object-delta";
        // A healed json object from the first chunk of this generation until this delta
        partial: DeepPartial<T>;
        // Just the delta of the object since the last delta
        delta: string;
      }
    | GeneratedObject<T>;

export const GeneratedTextOutputSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("text"),
  text: z.string(),
});
export type GeneratedText = z.infer<typeof GeneratedTextOutputSchema>;

export type TextStreamPart =
  | {
      type: "text-delta";
      // The partial text generated from the start of the stream until this delta
      partial: string;
      // The delta of the text since the last delta
      delta: string;
    }
  | GeneratedText;

export type ToolCallPart =
  | ToolCall
  | {
      type: "tool-call-delta";
      toolCallId: string;
      toolName: string;
      // The partial tool call from the start of the stream until this delta, healed to be valid json
      partial: JSONObject;
      // The delta of the tool call since the last delta
      delta: string;
    };

export const APICallSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("api-call"),
  apiName: z.string(),
  operationId: z.string(),
  request: z.object({
    body: z.record(z.unknown()).optional(),
    headers: z.record(z.string()).optional(),
    method: z.enum(["POST", "GET", "PUT", "DELETE"]),
    url: z.string(),
  }),
});

export type APICall = z.infer<typeof APICallSchema>;

export type APICallPart =
  | {
      type: "api-call-delta";
      // The name of the openapi api that was called
      apiName: string;
      // The openai operation id of the openapi api that was called
      operationId: string;
      // The partial api call argument from the start of the stream until this delta, healed to be valid json
      partial: JSONObject;
      // The delta of the api call since the last delta
      delta: string;
    }
  | APICall;

export const APICallResultSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("api-call-result"),
  apiName: z.string(),
  operationId: z.string(),
  response: z.object({
    body: z.record(z.unknown()),
    headers: z.record(z.string()),
  }),
});
export type APICallResult = z.infer<typeof APICallResultSchema>;

export type APIStreamEvent =
  | StepComplete
  | ErrorResult
  | ObjectStreamPart
  | TextStreamPart
  | ToolCallPart
  | APICallPart
  | APICallResult;

export const ToolResultOutputSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("tool-result"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  result: z.string(),
});

export const GeneratedObjectOutputSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("object"),
  object: z.record(z.string(), z.unknown()),
});
export type RunEvent = {
  // The name of the step that produced the event
  step: string;
  // The uuid of the instance of  running step that produced the event
  // e.g. if a step is run 2x in one "Run", each instance will have a different uuid
  uuid: string;
  // The type of the step that produced the event
  type: string;
  // The id of the run that the event belongs to
  runId: string;
  // The event produced by the step
  event: APIStreamEvent;
};

export type RunOutput = {
  // The name of the step that produced the event
  step: string;
  // The uuid of the instance of  running step that produced the event
  // e.g. if a step is run 2x in one "Run", each instance will have a different uuid
  uuid: string;
  // The type of the step that produced the event
  type: string;
  // The id of the run that the event belongs to
  runId: string;
  // The event produced by the step
  output: RunstepOutput;
};

export type RunStepStream = ReplayableAsyncIterableStream<APIStreamEvent>;

/**
 * Tool calling types
 */

export const ToolCallOutputSchema = z.object({
  type: z.literal("tool-call"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.any(),
});

export const toolCallStepOutputSchema = <T extends z.ZodObject<any>>(
  toolSchema: T
) =>
  z.object({
    type: z.literal("tool-call"),
    toolCallId: z.string(),
    toolName: z.string(),
    args: toolSchema,
  });

export type ToolCallSchema<T extends z.ZodObject<any> = z.ZodObject<any>> =
  ReturnType<typeof toolCallStepOutputSchema<T>>;

export type ToolCall<
  Name extends string = string,
  T extends Record<string, unknown> = Record<string, unknown>,
> = Omit<z.infer<ToolCallSchema>, "args" | "toolName"> & {
  args: T;
  toolName: Name;
};

export type ToolCallArray = Array<ToolCall>;

export const ToolResultSchema = z.object({
  type: z.literal("tool-result"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
  result: z.any(),
});

export const ImageOutputSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("image_url"),
  image_url: z.object({
    url: z.string(),
  }),
});

export const InputAudioSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("input_audio"),
  input_audio: z.object({
    data: z.string(),
    format: z.string(),
  }),
});

export const RunstepOutputBaseSchema = z.discriminatedUnion("type", [
  ToolCallOutputSchema,
  ToolResultSchema,
  GeneratedTextOutputSchema,
  GeneratedObjectSchema,
  APICallSchema,
  APICallResultSchema,
  ErrorResultSchema,
  FilesSchema,
  ImageOutputSchema,
  InputAudioSchema,
]);
export type RunstepOutputBaseSchema =
  (typeof RunstepOutputBaseSchema)["_def"]["options"][number];

export type RunstepOutputBase = z.infer<RunstepOutputBaseSchema>;

export const MergedResultSchema = BaseRunStepOuputSchema.extend({
  type: z.literal("merged-results"),
  results: z.array(
    z.object({
      name: z.string(),
      index: z.number(),
      value: RunstepOutputBaseSchema,
    })
  ),
});

export type MergedResult = z.infer<typeof MergedResultSchema>;

export const RunstepOutputSchema = z.union([
  ToolResultSchema,
  ToolCallOutputSchema,
  GeneratedTextOutputSchema,
  GeneratedObjectSchema,
  MergedResultSchema,
  APICallSchema,
  APICallResultSchema,
  ErrorResultSchema,
]);
export type RunstepOutputSchemaType =
  | (typeof RunstepOutputSchema)["_def"]["options"][number]
  | ToolCallSchema<any>;

export type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
      | { type: "input_audio"; input_audio: { data: string; format: string } }
    >;

export type RunstepOutput = z.infer<RunstepOutputSchemaType>;
export type ToolResult = z.infer<typeof ToolResultSchema>;
export type ToolResultArray = Array<ToolResult>;

export type FinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other"
  | "unknown";
export type LogProbs = Array<{
  token: string;
  logprob: number;
  topLogprobs: Array<{
    token: string;
    logprob: number;
  }>;
}>;

export type Secrets = {
  user?: Record<string, string>;
  system: {
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    FIREWORKS_API_KEY?: string;
    CEREBRAS_API_KEY?: string;

    FIREWORKS_BASE_URL?: string;
    FIRESEARCH_USERNAME?: string;
    FIRESEARCH_PASSWORD?: string;
    FIRESEARCH_ENDPOINT?: string;
    AUDIO_ENDPOINT?: string;
  };
};

export type RunStepContextSerialized = Awaited<
  ReturnType<StepContext<{}, RunstepOutput>["serialize"]>
>;
