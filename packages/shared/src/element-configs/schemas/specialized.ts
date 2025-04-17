import { z } from "zod";
import {
  type AllowedChildrenType,
  type BaseElementDefinition,
  ValueType,
} from "../../types";
import {
  elementExpressionCallbackSchema,
  jsTemplateStringSchema,
} from "../../utils/zod";

/**
 * Specialized Elements
 * These elements provide additional functionality beyond standard SCXML
 */

// LLM Element - AI/Language Model Integration
export const llmConfig: BaseElementDefinition = {
  tag: "llm",
  propsSchema: z.object({
    id: z.string().optional(),
    model: z.string(),
    instructions: jsTemplateStringSchema.optional(),
    prompt: jsTemplateStringSchema.optional(), // Add prompt field
    temperature: z.number().min(0).max(2).optional(),
    includeChatHistory: z.boolean().optional(),
    stopSequences: z.array(z.string()).optional(),
    topP: z.number().min(0).max(1).optional(),
    toolChoice: z.string().optional(),
    tools: z.array(z.any()).optional(),
    grammar: z.string().optional(),
    repetitionPenalty: z.number().optional(),
    responseFormat: z.union([z.literal("text"), z.object({})]).optional(),
  }),
  description: "Invokes an external service (LLM/AI integration)",
  allowedChildren: ["prompt", "instructions"] as AllowedChildrenType,
  type: "action",
  subType: "model",
  documentation: "Invokes an external service (LLM/AI integration)",
};

export type LLMProps = z.infer<typeof llmConfig.propsSchema>;

// Prompt Element - Prompt for LLM
export const promptConfig: BaseElementDefinition = {
  tag: "prompt",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Defines the prompt text for an LLM",
  allowedChildren: "text" as AllowedChildrenType,
  type: "param",
  documentation: "Defines the prompt text for an LLM",
};

export type PromptProps = z.infer<typeof promptConfig.propsSchema>;

// Instructions Element - Instructions for LLM
export const instructionsConfig: BaseElementDefinition = {
  tag: "instructions",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Defines the instructions for an LLM",
  allowedChildren: "text" as AllowedChildrenType,
  type: "param",
  documentation: "Defines the instructions for an LLM",
};

export type InstructionsProps = z.infer<typeof instructionsConfig.propsSchema>;

// Data Element - Data model variable
export const dataConfig: BaseElementDefinition = {
  tag: "data",
  type: "param",
  subType: "datamodel",
  propsSchema: z.object({
    id: z.string(),
    src: z.string().optional(),
    expr: elementExpressionCallbackSchema.optional(),
    value: z.any().optional(),
    content: z.string().optional(),
    type: z
      .enum([
        ValueType.STRING,
        ValueType.NUMBER,
        ValueType.BOOLEAN,
        ValueType.JSON,
      ])
      .default(ValueType.STRING),
    readonly: z.boolean().default(false),
    fromRequest: z.boolean().default(false),
    defaultValue: z.any().optional(),
    schema: z.any().optional(), // Schema for JSON type
  }),
  description: "Declares a data model variable",
  allowedChildren: "text" as AllowedChildrenType,
  documentation:
    "Declares a data model variable with optional initial value and type",
};

export type DataProps = z.infer<typeof dataConfig.propsSchema>;

// DataModel Element - Container for data declarations
export const dataModelConfig: BaseElementDefinition = {
  tag: "datamodel",
  type: "param",
  subType: "datamodel",
  description: "Container for data model declarations",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  allowedChildren: ["data"] as AllowedChildrenType,
  documentation: "Container for data model declarations",
};

export type DataModelProps = z.infer<typeof dataModelConfig.propsSchema>;

// SendText Element - Sends text response
export const sendTextConfig: BaseElementDefinition = {
  tag: "sendText",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Sends text response to the user",
  allowedChildren: "text" as AllowedChildrenType,
  type: "action",
  documentation: "Sends text response to the user",
};

export type SendTextProps = z.infer<typeof sendTextConfig.propsSchema>;

// SendToolCalls Element - Sends tool calls
export const sendToolCallsConfig: BaseElementDefinition = {
  tag: "sendToolCalls",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Sends tool calls to the user",
  allowedChildren: "text" as AllowedChildrenType,
  type: "action",
  documentation: "Sends tool calls to the user",
};

export type SendToolCallsProps = z.infer<
  typeof sendToolCallsConfig.propsSchema
>;

// SendObject Element - Sends object response
export const sendObjectConfig: BaseElementDefinition = {
  tag: "sendObject",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Sends object response to the user",
  allowedChildren: "text" as AllowedChildrenType,
  type: "action",
  documentation: "Sends object response to the user",
};

export type SendObjectProps = z.infer<typeof sendObjectConfig.propsSchema>;

// ToolCall Element - Tool call integration
export const toolCallConfig: BaseElementDefinition = {
  tag: "toolcall",
  propsSchema: z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
  }),
  description: "Invokes a tool",
  allowedChildren: "text" as AllowedChildrenType,
  type: "action",
  documentation: "Invokes a tool",
};

export type ToolCallProps = z.infer<typeof toolCallConfig.propsSchema>;

// OnError Element - Error handling
export const onErrorConfig: BaseElementDefinition = {
  tag: "onerror",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Handles errors",
  allowedChildren: "any" as AllowedChildrenType,
  type: "action",
  documentation: "Handles errors",
};

export type OnErrorProps = z.infer<typeof onErrorConfig.propsSchema>;

// OnChunk Element - Chunk handling
export const onChunkConfig: BaseElementDefinition = {
  tag: "onchunk",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Handles chunks of data",
  allowedChildren: "any" as AllowedChildrenType,
  type: "action",
  documentation: "Handles chunks of data",
};

export type OnChunkProps = z.infer<typeof onChunkConfig.propsSchema>;
