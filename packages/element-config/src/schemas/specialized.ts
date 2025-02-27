import { z } from "zod";
import type { AllowedChildrenType } from "@fireworks/types";
import type { BaseElementDefinition } from "../types";

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
    system: z.string().optional(),
    temperature: z.number().optional(),
    includeChatHistory: z.boolean().optional(),
    stopSequences: z.array(z.string()).optional(),
    topP: z.number().optional(),
    toolChoice: z.string().optional(),
    tools: z.array(z.any()).optional(),
    grammar: z.string().optional(),
    repetitionPenalty: z.number().optional(),
    responseFormat: z
      .object({
        type: z.enum(["json", "text", "gbnf"]),
        schema: z.record(z.any()).optional(),
      })
      .optional(),
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
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Defines the instructions for an LLM",
  allowedChildren: "text" as AllowedChildrenType,
  role: "user-input",
  documentation: "Defines the instructions for an LLM",
};

export type InstructionsProps = z.infer<typeof instructionsConfig.propsSchema>;

// Data Element - Data Model Variable Definition
export const dataConfig: BaseElementDefinition = {
  tag: "data",
  propsSchema: z.object({
    id: z.string(),
    expr: z.string().optional(),
    src: z.string().optional(),
  }),
  description: "Declares a data item",
  allowedChildren: "text" as AllowedChildrenType,
  documentation: "Declares a data item",
};

export type DataProps = z.infer<typeof dataConfig.propsSchema>;

// DataModel Element - Data Model Container
export const dataModelConfig: BaseElementDefinition = {
  tag: "datamodel",
  description: "Container for data model declarations",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  allowedChildren: ["data"] as AllowedChildrenType,
  documentation: "Container for data model declarations",
};

export type DataModelProps = z.infer<typeof dataModelConfig.propsSchema>;

// Workflow Root Element (replacing SCXML)
export const workflowConfig: BaseElementDefinition = {
  tag: "workflow",
  propsSchema: z.object({
    id: z.string().optional(),
    version: z.string().optional(),
    initial: z.string().optional(),
    name: z.string().optional(),
    xmlns: z.string().optional(),
    datamodel: z.string().optional(),
    binding: z.enum(["early", "late"]).optional(),
  }),
  description: "Root element of a Workflow document",
  documentation: "Root element that defines the workflow",
  allowedChildren: [
    "state",
    "parallel",
    "final",
    "datamodel",
    "script",
  ] as AllowedChildrenType,
  isRoot: true,
};

export type WorkflowProps = z.infer<typeof workflowConfig.propsSchema>;

// SendText Element - Sends text response
export const sendTextConfig: BaseElementDefinition = {
  tag: "sendText",
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
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Handles chunks of data",
  allowedChildren: "any" as AllowedChildrenType,
  role: "action",
  documentation: "Handles chunks of data",
};

export type OnChunkProps = z.infer<typeof onChunkConfig.propsSchema>;
