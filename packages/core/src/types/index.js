import { z } from "zod";
import { ErrorCode } from "../utils/errorCodes";
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
export const FilesSchema = BaseRunStepOuputSchema.extend({
    type: z.literal("files"),
    files: z.array(z.object({
        type: z.enum(["pdf", "image", "text", "audio", "video"]),
        format: z.enum(["base64", "binary", "url"]),
    })),
});
export const GeneratedObjectSchema = BaseRunStepOuputSchema.extend({
    type: z.literal("object"),
    object: z
        .union([z.record(z.unknown()), z.array(z.record(z.unknown()))])
        .describe("The full object once the stream is finished. If the stream ended prematurely, the object will be healed to be valid but it might be incomplete."),
    wasHealed: z
        .boolean()
        .optional()
        .describe("Whether the object was healed or not."),
    raw: z
        .string()
        .describe("The full generation from the start of the object until done. Might be incomplete if generation ended prematurely."),
});
export const GeneratedTextOutputSchema = BaseRunStepOuputSchema.extend({
    type: z.literal("text"),
    text: z.string(),
});
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
export const APICallResultSchema = BaseRunStepOuputSchema.extend({
    type: z.literal("api-call-result"),
    apiName: z.string(),
    operationId: z.string(),
    response: z.object({
        body: z.record(z.unknown()),
        headers: z.record(z.string()),
    }),
});
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
/**
 * Tool calling types
 */
export const ToolCallOutputSchema = z.object({
    type: z.literal("tool-call"),
    toolCallId: z.string(),
    toolName: z.string(),
    args: z.any(),
});
export const toolCallStepOutputSchema = (toolSchema) => z.object({
    type: z.literal("tool-call"),
    toolCallId: z.string(),
    toolName: z.string(),
    args: toolSchema,
});
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
export const MergedResultSchema = BaseRunStepOuputSchema.extend({
    type: z.literal("merged-results"),
    results: z.array(z.object({
        name: z.string(),
        index: z.number(),
        value: RunstepOutputBaseSchema,
    })),
});
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
//# sourceMappingURL=index.js.map