import { z } from "zod";
import {
  type AllowedChildrenType,
  type BaseElementDefinition,
  ValueType,
} from "../../types";
import { jsExpressionSchema, jsTemplateStringSchema } from "../../utils/zod";

/**
 * Specialized Elements
 * These elements provide additional functionality beyond standard SCXML
 */

// LLM Element - AI/Language Model Integration
export const llmConfig: BaseElementDefinition = {
  tag: "llm",
  elementType: "llm",
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
    responseFormat: z.enum(["text", "json"]).optional(),
  }),
  description: "Invokes an external service (LLM/AI integration)",
  allowedChildren: ["prompt", "instructions"] as AllowedChildrenType,
  role: "action",
  documentation: "Invokes an external service (LLM/AI integration)",
};

export type LLMProps = z.infer<typeof llmConfig.propsSchema>;

// Prompt Element - Prompt for LLM
export const promptConfig: BaseElementDefinition = {
  tag: "prompt",
  elementType: "prompt",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Defines the prompt text for an LLM",
  allowedChildren: "text" as AllowedChildrenType,
  role: "user-input",
  documentation: "Defines the prompt text for an LLM",
};

export type PromptProps = z.infer<typeof promptConfig.propsSchema>;

// Instructions Element - Instructions for LLM
export const instructionsConfig: BaseElementDefinition = {
  tag: "instructions",
  elementType: "instructions",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Defines the instructions for an LLM",
  allowedChildren: "text" as AllowedChildrenType,
  role: "user-input",
  documentation: "Defines the instructions for an LLM",
};

export type InstructionsProps = z.infer<typeof instructionsConfig.propsSchema>;

// Data Element - Data model variable
export const dataConfig: BaseElementDefinition = {
  tag: "data",
  elementType: "data",
  role: "data-model",
  propsSchema: z.object({
    id: z.string(),
    src: z.string().optional(),
    expr: jsExpressionSchema.optional(),
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
  elementType: "datamodel",
  role: "data-model",
  description: "Container for data model declarations",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  allowedChildren: ["data"] as AllowedChildrenType,
  documentation: "Container for data model declarations",
};

export type DataModelProps = z.infer<typeof dataModelConfig.propsSchema>;

// Workflow Element - Root workflow element
export const workflowConfig: BaseElementDefinition = {
  tag: "workflow",
  elementType: "workflow",
  role: "state",
  propsSchema: z.object({
    id: z.string().optional(),
    initial: z.string().optional(),
  }),
  description: "Root workflow element",
  allowedChildren: [
    "state",
    "parallel",
    "final",
    "datamodel",
    "onentry",
    "onexit",
    "transition",
  ] as AllowedChildrenType,
  documentation: "Root workflow element, the main container for the workflow",
  isRoot: true,
};

export type WorkflowProps = z.infer<typeof workflowConfig.propsSchema>;

// SendText Element - Sends text response
export const sendTextConfig: BaseElementDefinition = {
  tag: "sendText",
  elementType: "sendText",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Sends text response to the user",
  allowedChildren: "text" as AllowedChildrenType,
  role: "output",
  documentation: "Sends text response to the user",
};

export type SendTextProps = z.infer<typeof sendTextConfig.propsSchema>;

// SendToolCalls Element - Sends tool calls
export const sendToolCallsConfig: BaseElementDefinition = {
  tag: "sendToolCalls",
  elementType: "sendToolCalls",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Sends tool calls to the user",
  allowedChildren: "text" as AllowedChildrenType,
  role: "output",
  documentation: "Sends tool calls to the user",
};

export type SendToolCallsProps = z.infer<
  typeof sendToolCallsConfig.propsSchema
>;

// SendObject Element - Sends object response
export const sendObjectConfig: BaseElementDefinition = {
  tag: "sendObject",
  elementType: "sendObject",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Sends object response to the user",
  allowedChildren: "text" as AllowedChildrenType,
  role: "output",
  documentation: "Sends object response to the user",
};

export type SendObjectProps = z.infer<typeof sendObjectConfig.propsSchema>;

// ToolCall Element - Tool call integration
export const toolCallConfig: BaseElementDefinition = {
  tag: "toolcall",
  elementType: "toolcall",
  propsSchema: z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
  }),
  description: "Invokes a tool",
  allowedChildren: "text" as AllowedChildrenType,
  role: "action",
  documentation: "Invokes a tool",
};

export type ToolCallProps = z.infer<typeof toolCallConfig.propsSchema>;

// OnError Element - Error handling
export const onErrorConfig: BaseElementDefinition = {
  tag: "onerror",
  elementType: "onerror",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Handles errors",
  allowedChildren: "any" as AllowedChildrenType,
  role: "error",
  documentation: "Handles errors",
};

export type OnErrorProps = z.infer<typeof onErrorConfig.propsSchema>;

// OnChunk Element - Chunk handling
export const onChunkConfig: BaseElementDefinition = {
  tag: "onchunk",
  elementType: "onchunk",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Handles chunks of data",
  allowedChildren: "any" as AllowedChildrenType,
  role: "action",
  documentation: "Handles chunks of data",
};

export type OnChunkProps = z.infer<typeof onChunkConfig.propsSchema>;
