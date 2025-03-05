import type { JSONSchemaArray, JSONSchemaObject } from "openai/lib/jsonschema";
import { z } from "zod";
import type { ElementExecutionContext } from "../runtime/ElementExecutionContext";
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
type DeepPartial<T> = T extends null | undefined | string | number | boolean | symbol | bigint | void | Date | RegExp | ((...arguments_: any[]) => unknown) | (new (...arguments_: any[]) => unknown) ? T : T extends Map<infer KeyType, infer ValueType> ? PartialMap<KeyType, ValueType> : T extends Set<infer ItemType> ? PartialSet<ItemType> : T extends ReadonlyMap<infer KeyType, infer ValueType> ? PartialReadonlyMap<KeyType, ValueType> : T extends ReadonlySet<infer ItemType> ? PartialReadonlySet<ItemType> : T extends z.Schema<any> ? DeepPartial<T["_type"]> : T extends object ? T extends ReadonlyArray<infer ItemType> ? ItemType[] extends T ? readonly ItemType[] extends T ? ReadonlyArray<DeepPartial<ItemType | undefined>> : Array<DeepPartial<ItemType | undefined>> : PartialObject<T> : PartialObject<T> : unknown;
type PartialMap<KeyType, ValueType> = {} & Map<DeepPartial<KeyType>, DeepPartial<ValueType>>;
type PartialSet<T> = {} & Set<DeepPartial<T>>;
type PartialReadonlyMap<KeyType, ValueType> = {} & ReadonlyMap<DeepPartial<KeyType>, DeepPartial<ValueType>>;
type PartialReadonlySet<T> = {} & ReadonlySet<DeepPartial<T>>;
type PartialObject<ObjectType extends object> = {
    [KeyType in keyof ObjectType]?: DeepPartial<ObjectType[KeyType]>;
};
/**
 * JSON Types
 * Used to type unknown JSON values but ensure that the values are compatible with serializing and deserializing to JSON.
 */
export type JSON = {
    [key: string]: JSONValues;
} | JSONValues[];
export type JSONValues = string | number | boolean | null | {
    [key: string]: JSONValues;
} | JSONValues[];
export type JSONSchema = JSONSchemaObject | JSONSchemaArray;
export type Primitives = string | number | boolean | null;
export type JSONObject = {
    [key: string]: Primitives | JSONValue;
};
export type JSONArray = Primitives[] | JSONObject[];
export type JSONValue = JSONArray | JSONObject;
/**
 * ObjectWithSchema type
 * A record that takes a JSONObject and is typed by it
 */
export type ObjectWithSchema<Schema extends JSONSchemaObject> = {
    [K in keyof Schema]: Schema[K] extends JSONSchemaObject ? ObjectWithSchema<Schema[K] & JSONObject> : Schema[K] extends JSONSchemaObject ? ObjectWithSchema<Schema[K] & JSONObject> : Schema[K] extends JSONSchemaArray ? ObjectWithSchema<Schema[K][number] & JSONObject>[] : Schema[K];
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
export declare const BaseRunStepOuputSchema: z.ZodObject<{
    type: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
}, {
    type: string;
}>;
export declare const ErrorResultSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"error">;
    error: z.ZodString;
    step: z.ZodOptional<z.ZodString>;
    code: z.ZodNativeEnum<typeof ErrorCode>;
}>, "strip", z.ZodTypeAny, {
    error: string;
    type: "error";
    code: ErrorCode;
    step?: string | undefined;
}, {
    error: string;
    type: "error";
    code: ErrorCode;
    step?: string | undefined;
}>;
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
export declare const FilesSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"files">;
    files: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["pdf", "image", "text", "audio", "video"]>;
        format: z.ZodEnum<["base64", "binary", "url"]>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "image" | "pdf" | "audio" | "video";
        format: "url" | "base64" | "binary";
    }, {
        type: "text" | "image" | "pdf" | "audio" | "video";
        format: "url" | "base64" | "binary";
    }>, "many">;
}>, "strip", z.ZodTypeAny, {
    type: "files";
    files: {
        type: "text" | "image" | "pdf" | "audio" | "video";
        format: "url" | "base64" | "binary";
    }[];
}, {
    type: "files";
    files: {
        type: "text" | "image" | "pdf" | "audio" | "video";
        format: "url" | "base64" | "binary";
    }[];
}>;
export type Files = z.infer<typeof FilesSchema>;
export declare const GeneratedObjectSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"object">;
    object: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">]>;
    wasHealed: z.ZodOptional<z.ZodBoolean>;
    raw: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    object: Record<string, unknown> | Record<string, unknown>[];
    type: "object";
    raw: string;
    wasHealed?: boolean | undefined;
}, {
    object: Record<string, unknown> | Record<string, unknown>[];
    type: "object";
    raw: string;
    wasHealed?: boolean | undefined;
}>;
export type GeneratedObject<T extends any = Record<string, unknown>> = z.infer<typeof GeneratedObjectSchema> & {
    object: T;
};
export type ObjectStreamPart<T extends JSONObject | JSONObject[] = JSONObject> = {
    type: "object-delta";
    partial: DeepPartial<T>;
    delta: string;
} | GeneratedObject<T>;
export declare const GeneratedTextOutputSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    text: string;
    type: "text";
}, {
    text: string;
    type: "text";
}>;
export type GeneratedText = z.infer<typeof GeneratedTextOutputSchema>;
export type TextStreamPart = {
    type: "text-delta";
    partial: string;
    delta: string;
} | GeneratedText;
export type ToolCallPart = ToolCall | {
    type: "tool-call-delta";
    toolCallId: string;
    toolName: string;
    partial: JSONObject;
    delta: string;
};
export declare const APICallSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"api-call">;
    apiName: z.ZodString;
    operationId: z.ZodString;
    request: z.ZodObject<{
        body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        method: z.ZodEnum<["POST", "GET", "PUT", "DELETE"]>;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    }, {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "api-call";
    apiName: string;
    operationId: string;
    request: {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    };
}, {
    type: "api-call";
    apiName: string;
    operationId: string;
    request: {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    };
}>;
export type APICall = z.infer<typeof APICallSchema>;
export type APICallPart = {
    type: "api-call-delta";
    apiName: string;
    operationId: string;
    partial: JSONObject;
    delta: string;
} | APICall;
export declare const APICallResultSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"api-call-result">;
    apiName: z.ZodString;
    operationId: z.ZodString;
    response: z.ZodObject<{
        body: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        headers: z.ZodRecord<z.ZodString, z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    }, {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "api-call-result";
    apiName: string;
    operationId: string;
    response: {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    };
}, {
    type: "api-call-result";
    apiName: string;
    operationId: string;
    response: {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    };
}>;
export type APICallResult = z.infer<typeof APICallResultSchema>;
export type APIStreamEvent = StepComplete | ErrorResult | ObjectStreamPart | TextStreamPart | ToolCallPart | APICallPart | APICallResult;
export declare const ToolResultOutputSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"tool-result">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    result: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result: string;
}, {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result: string;
}>;
export declare const GeneratedObjectOutputSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"object">;
    object: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}>, "strip", z.ZodTypeAny, {
    object: Record<string, unknown>;
    type: "object";
}, {
    object: Record<string, unknown>;
    type: "object";
}>;
export type RunEvent = {
    step: string;
    uuid: string;
    type: string;
    runId: string;
    event: APIStreamEvent;
};
export type RunOutput = {
    step: string;
    uuid: string;
    type: string;
    runId: string;
    output: RunstepOutput;
};
export type RunStepStream = ReplayableAsyncIterableStream<APIStreamEvent>;
/**
 * Tool calling types
 */
export declare const ToolCallOutputSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args?: any;
}, {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args?: any;
}>;
export declare const toolCallStepOutputSchema: <T extends z.ZodObject<any>>(toolSchema: T) => z.ZodObject<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: T;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: T;
}>, any> extends infer T_1 ? { [k in keyof T_1]: z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: T;
}>, any>[k]; } : never, z.baseObjectInputType<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: T;
}> extends infer T_2 ? { [k_1 in keyof T_2]: z.baseObjectInputType<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: T;
}>[k_1]; } : never>;
export type ToolCallSchema<T extends z.ZodObject<any> = z.ZodObject<any>> = ReturnType<typeof toolCallStepOutputSchema<T>>;
export type ToolCall<Name extends string = string, T extends Record<string, unknown> = Record<string, unknown>> = Omit<z.infer<ToolCallSchema>, "args" | "toolName"> & {
    args: T;
    toolName: Name;
};
export type ToolCallArray = Array<ToolCall>;
export declare const ToolResultSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool-result">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    result: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: any;
}, {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: any;
}>;
export declare const ImageOutputSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"image_url">;
    image_url: z.ZodObject<{
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "image_url";
    image_url: {
        url: string;
    };
}, {
    type: "image_url";
    image_url: {
        url: string;
    };
}>;
export declare const InputAudioSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"input_audio">;
    input_audio: z.ZodObject<{
        data: z.ZodString;
        format: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        data: string;
        format: string;
    }, {
        data: string;
        format: string;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "input_audio";
    input_audio: {
        data: string;
        format: string;
    };
}, {
    type: "input_audio";
    input_audio: {
        data: string;
        format: string;
    };
}>;
export declare const RunstepOutputBaseSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args?: any;
}, {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args?: any;
}>, z.ZodObject<{
    type: z.ZodLiteral<"tool-result">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    result: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: any;
}, {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: any;
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    text: string;
    type: "text";
}, {
    text: string;
    type: "text";
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"object">;
    object: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">]>;
    wasHealed: z.ZodOptional<z.ZodBoolean>;
    raw: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    object: Record<string, unknown> | Record<string, unknown>[];
    type: "object";
    raw: string;
    wasHealed?: boolean | undefined;
}, {
    object: Record<string, unknown> | Record<string, unknown>[];
    type: "object";
    raw: string;
    wasHealed?: boolean | undefined;
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"api-call">;
    apiName: z.ZodString;
    operationId: z.ZodString;
    request: z.ZodObject<{
        body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        method: z.ZodEnum<["POST", "GET", "PUT", "DELETE"]>;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    }, {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "api-call";
    apiName: string;
    operationId: string;
    request: {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    };
}, {
    type: "api-call";
    apiName: string;
    operationId: string;
    request: {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    };
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"api-call-result">;
    apiName: z.ZodString;
    operationId: z.ZodString;
    response: z.ZodObject<{
        body: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        headers: z.ZodRecord<z.ZodString, z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    }, {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "api-call-result";
    apiName: string;
    operationId: string;
    response: {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    };
}, {
    type: "api-call-result";
    apiName: string;
    operationId: string;
    response: {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    };
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"error">;
    error: z.ZodString;
    step: z.ZodOptional<z.ZodString>;
    code: z.ZodNativeEnum<typeof ErrorCode>;
}>, "strip", z.ZodTypeAny, {
    error: string;
    type: "error";
    code: ErrorCode;
    step?: string | undefined;
}, {
    error: string;
    type: "error";
    code: ErrorCode;
    step?: string | undefined;
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"files">;
    files: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["pdf", "image", "text", "audio", "video"]>;
        format: z.ZodEnum<["base64", "binary", "url"]>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "image" | "pdf" | "audio" | "video";
        format: "url" | "base64" | "binary";
    }, {
        type: "text" | "image" | "pdf" | "audio" | "video";
        format: "url" | "base64" | "binary";
    }>, "many">;
}>, "strip", z.ZodTypeAny, {
    type: "files";
    files: {
        type: "text" | "image" | "pdf" | "audio" | "video";
        format: "url" | "base64" | "binary";
    }[];
}, {
    type: "files";
    files: {
        type: "text" | "image" | "pdf" | "audio" | "video";
        format: "url" | "base64" | "binary";
    }[];
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"image_url">;
    image_url: z.ZodObject<{
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "image_url";
    image_url: {
        url: string;
    };
}, {
    type: "image_url";
    image_url: {
        url: string;
    };
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"input_audio">;
    input_audio: z.ZodObject<{
        data: z.ZodString;
        format: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        data: string;
        format: string;
    }, {
        data: string;
        format: string;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "input_audio";
    input_audio: {
        data: string;
        format: string;
    };
}, {
    type: "input_audio";
    input_audio: {
        data: string;
        format: string;
    };
}>]>;
export type RunstepOutputBaseSchema = (typeof RunstepOutputBaseSchema)["_def"]["options"][number];
export type RunstepOutputBase = z.infer<RunstepOutputBaseSchema>;
export declare const MergedResultSchema: z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"merged-results">;
    results: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        index: z.ZodNumber;
        value: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"tool-call">;
            toolCallId: z.ZodString;
            toolName: z.ZodString;
            args: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        }, {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"tool-result">;
            toolCallId: z.ZodString;
            toolName: z.ZodString;
            args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            result: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        }, {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }>, "strip", z.ZodTypeAny, {
            text: string;
            type: "text";
        }, {
            text: string;
            type: "text";
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"object">;
            object: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">]>;
            wasHealed: z.ZodOptional<z.ZodBoolean>;
            raw: z.ZodString;
        }>, "strip", z.ZodTypeAny, {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        }, {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"api-call">;
            apiName: z.ZodString;
            operationId: z.ZodString;
            request: z.ZodObject<{
                body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                method: z.ZodEnum<["POST", "GET", "PUT", "DELETE"]>;
                url: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            }, {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            }>;
        }>, "strip", z.ZodTypeAny, {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        }, {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"api-call-result">;
            apiName: z.ZodString;
            operationId: z.ZodString;
            response: z.ZodObject<{
                body: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                headers: z.ZodRecord<z.ZodString, z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            }, {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            }>;
        }>, "strip", z.ZodTypeAny, {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        }, {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"error">;
            error: z.ZodString;
            step: z.ZodOptional<z.ZodString>;
            code: z.ZodNativeEnum<typeof ErrorCode>;
        }>, "strip", z.ZodTypeAny, {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        }, {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"files">;
            files: z.ZodArray<z.ZodObject<{
                type: z.ZodEnum<["pdf", "image", "text", "audio", "video"]>;
                format: z.ZodEnum<["base64", "binary", "url"]>;
            }, "strip", z.ZodTypeAny, {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }, {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }>, "many">;
        }>, "strip", z.ZodTypeAny, {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        }, {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"image_url">;
            image_url: z.ZodObject<{
                url: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                url: string;
            }, {
                url: string;
            }>;
        }>, "strip", z.ZodTypeAny, {
            type: "image_url";
            image_url: {
                url: string;
            };
        }, {
            type: "image_url";
            image_url: {
                url: string;
            };
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"input_audio">;
            input_audio: z.ZodObject<{
                data: z.ZodString;
                format: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                data: string;
                format: string;
            }, {
                data: string;
                format: string;
            }>;
        }>, "strip", z.ZodTypeAny, {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        }, {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        }>]>;
    }, "strip", z.ZodTypeAny, {
        value: {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        } | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        } | {
            text: string;
            type: "text";
        } | {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        } | {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        } | {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        } | {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        } | {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        } | {
            type: "image_url";
            image_url: {
                url: string;
            };
        } | {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        };
        name: string;
        index: number;
    }, {
        value: {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        } | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        } | {
            text: string;
            type: "text";
        } | {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        } | {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        } | {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        } | {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        } | {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        } | {
            type: "image_url";
            image_url: {
                url: string;
            };
        } | {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        };
        name: string;
        index: number;
    }>, "many">;
}>, "strip", z.ZodTypeAny, {
    type: "merged-results";
    results: {
        value: {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        } | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        } | {
            text: string;
            type: "text";
        } | {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        } | {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        } | {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        } | {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        } | {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        } | {
            type: "image_url";
            image_url: {
                url: string;
            };
        } | {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        };
        name: string;
        index: number;
    }[];
}, {
    type: "merged-results";
    results: {
        value: {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        } | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        } | {
            text: string;
            type: "text";
        } | {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        } | {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        } | {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        } | {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        } | {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        } | {
            type: "image_url";
            image_url: {
                url: string;
            };
        } | {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        };
        name: string;
        index: number;
    }[];
}>;
export type MergedResult = z.infer<typeof MergedResultSchema>;
export declare const RunstepOutputSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"tool-result">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    result: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: any;
}, {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: any;
}>, z.ZodObject<{
    type: z.ZodLiteral<"tool-call">;
    toolCallId: z.ZodString;
    toolName: z.ZodString;
    args: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args?: any;
}, {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args?: any;
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    text: string;
    type: "text";
}, {
    text: string;
    type: "text";
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"object">;
    object: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">]>;
    wasHealed: z.ZodOptional<z.ZodBoolean>;
    raw: z.ZodString;
}>, "strip", z.ZodTypeAny, {
    object: Record<string, unknown> | Record<string, unknown>[];
    type: "object";
    raw: string;
    wasHealed?: boolean | undefined;
}, {
    object: Record<string, unknown> | Record<string, unknown>[];
    type: "object";
    raw: string;
    wasHealed?: boolean | undefined;
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"merged-results">;
    results: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        index: z.ZodNumber;
        value: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"tool-call">;
            toolCallId: z.ZodString;
            toolName: z.ZodString;
            args: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        }, {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"tool-result">;
            toolCallId: z.ZodString;
            toolName: z.ZodString;
            args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            result: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        }, {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }>, "strip", z.ZodTypeAny, {
            text: string;
            type: "text";
        }, {
            text: string;
            type: "text";
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"object">;
            object: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">]>;
            wasHealed: z.ZodOptional<z.ZodBoolean>;
            raw: z.ZodString;
        }>, "strip", z.ZodTypeAny, {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        }, {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"api-call">;
            apiName: z.ZodString;
            operationId: z.ZodString;
            request: z.ZodObject<{
                body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                method: z.ZodEnum<["POST", "GET", "PUT", "DELETE"]>;
                url: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            }, {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            }>;
        }>, "strip", z.ZodTypeAny, {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        }, {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"api-call-result">;
            apiName: z.ZodString;
            operationId: z.ZodString;
            response: z.ZodObject<{
                body: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                headers: z.ZodRecord<z.ZodString, z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            }, {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            }>;
        }>, "strip", z.ZodTypeAny, {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        }, {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"error">;
            error: z.ZodString;
            step: z.ZodOptional<z.ZodString>;
            code: z.ZodNativeEnum<typeof ErrorCode>;
        }>, "strip", z.ZodTypeAny, {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        }, {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"files">;
            files: z.ZodArray<z.ZodObject<{
                type: z.ZodEnum<["pdf", "image", "text", "audio", "video"]>;
                format: z.ZodEnum<["base64", "binary", "url"]>;
            }, "strip", z.ZodTypeAny, {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }, {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }>, "many">;
        }>, "strip", z.ZodTypeAny, {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        }, {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"image_url">;
            image_url: z.ZodObject<{
                url: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                url: string;
            }, {
                url: string;
            }>;
        }>, "strip", z.ZodTypeAny, {
            type: "image_url";
            image_url: {
                url: string;
            };
        }, {
            type: "image_url";
            image_url: {
                url: string;
            };
        }>, z.ZodObject<z.objectUtil.extendShape<{
            type: z.ZodString;
        }, {
            type: z.ZodLiteral<"input_audio">;
            input_audio: z.ZodObject<{
                data: z.ZodString;
                format: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                data: string;
                format: string;
            }, {
                data: string;
                format: string;
            }>;
        }>, "strip", z.ZodTypeAny, {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        }, {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        }>]>;
    }, "strip", z.ZodTypeAny, {
        value: {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        } | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        } | {
            text: string;
            type: "text";
        } | {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        } | {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        } | {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        } | {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        } | {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        } | {
            type: "image_url";
            image_url: {
                url: string;
            };
        } | {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        };
        name: string;
        index: number;
    }, {
        value: {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        } | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        } | {
            text: string;
            type: "text";
        } | {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        } | {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        } | {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        } | {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        } | {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        } | {
            type: "image_url";
            image_url: {
                url: string;
            };
        } | {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        };
        name: string;
        index: number;
    }>, "many">;
}>, "strip", z.ZodTypeAny, {
    type: "merged-results";
    results: {
        value: {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        } | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        } | {
            text: string;
            type: "text";
        } | {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        } | {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        } | {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        } | {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        } | {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        } | {
            type: "image_url";
            image_url: {
                url: string;
            };
        } | {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        };
        name: string;
        index: number;
    }[];
}, {
    type: "merged-results";
    results: {
        value: {
            type: "tool-result";
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: any;
        } | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args?: any;
        } | {
            text: string;
            type: "text";
        } | {
            object: Record<string, unknown> | Record<string, unknown>[];
            type: "object";
            raw: string;
            wasHealed?: boolean | undefined;
        } | {
            type: "api-call";
            apiName: string;
            operationId: string;
            request: {
                method: "POST" | "GET" | "PUT" | "DELETE";
                url: string;
                body?: Record<string, unknown> | undefined;
                headers?: Record<string, string> | undefined;
            };
        } | {
            type: "api-call-result";
            apiName: string;
            operationId: string;
            response: {
                body: Record<string, unknown>;
                headers: Record<string, string>;
            };
        } | {
            error: string;
            type: "error";
            code: ErrorCode;
            step?: string | undefined;
        } | {
            type: "files";
            files: {
                type: "text" | "image" | "pdf" | "audio" | "video";
                format: "url" | "base64" | "binary";
            }[];
        } | {
            type: "image_url";
            image_url: {
                url: string;
            };
        } | {
            type: "input_audio";
            input_audio: {
                data: string;
                format: string;
            };
        };
        name: string;
        index: number;
    }[];
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"api-call">;
    apiName: z.ZodString;
    operationId: z.ZodString;
    request: z.ZodObject<{
        body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        method: z.ZodEnum<["POST", "GET", "PUT", "DELETE"]>;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    }, {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "api-call";
    apiName: string;
    operationId: string;
    request: {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    };
}, {
    type: "api-call";
    apiName: string;
    operationId: string;
    request: {
        method: "POST" | "GET" | "PUT" | "DELETE";
        url: string;
        body?: Record<string, unknown> | undefined;
        headers?: Record<string, string> | undefined;
    };
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"api-call-result">;
    apiName: z.ZodString;
    operationId: z.ZodString;
    response: z.ZodObject<{
        body: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        headers: z.ZodRecord<z.ZodString, z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    }, {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    }>;
}>, "strip", z.ZodTypeAny, {
    type: "api-call-result";
    apiName: string;
    operationId: string;
    response: {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    };
}, {
    type: "api-call-result";
    apiName: string;
    operationId: string;
    response: {
        body: Record<string, unknown>;
        headers: Record<string, string>;
    };
}>, z.ZodObject<z.objectUtil.extendShape<{
    type: z.ZodString;
}, {
    type: z.ZodLiteral<"error">;
    error: z.ZodString;
    step: z.ZodOptional<z.ZodString>;
    code: z.ZodNativeEnum<typeof ErrorCode>;
}>, "strip", z.ZodTypeAny, {
    error: string;
    type: "error";
    code: ErrorCode;
    step?: string | undefined;
}, {
    error: string;
    type: "error";
    code: ErrorCode;
    step?: string | undefined;
}>]>;
export type RunstepOutputSchemaType = (typeof RunstepOutputSchema)["_def"]["options"][number] | ToolCallSchema<any>;
export type MessageContent = string | Array<{
    type: "text";
    text: string;
} | {
    type: "image_url";
    image_url: {
        url: string;
    };
} | {
    type: "input_audio";
    input_audio: {
        data: string;
        format: string;
    };
}>;
export type RunstepOutput = z.infer<RunstepOutputSchemaType>;
export type ToolResult = z.infer<typeof ToolResultSchema>;
export type ToolResultArray = Array<ToolResult>;
export type FinishReason = "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" | "unknown";
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
export type RunStepContextSerialized = Awaited<ReturnType<ElementExecutionContext<{}, RunstepOutput>["serialize"]>>;
export {};
//# sourceMappingURL=index.d.ts.map