import { z } from "zod";
import type { AllowedChildrenType, BaseElementDefinition } from "..";

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
    prompt: z.string(),
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
  allowedChildren: "text" as AllowedChildrenType,
  role: "action",
  scxmlType: "invoke",
  documentation: "Invokes an external service (LLM/AI integration)",
};

export type LLMProps = z.infer<typeof llmConfig.propsSchema>;

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

// SCXML Root Element
export const scxmlConfig: BaseElementDefinition = {
  tag: "scxml",
  propsSchema: z.object({
    id: z.string().optional(),
    version: z.string().optional(),
    initial: z.string().optional(),
    name: z.string().optional(),
    xmlns: z.string().optional(),
    datamodel: z.string().optional(),
    binding: z.enum(["early", "late"]).optional(),
  }),
  description: "Root element of a Workflow document (SCXML-based)",
  documentation: "scxml docs here",
  allowedChildren: [
    "state",
    "parallel",
    "final",
    "datamodel",
    "script",
  ] as AllowedChildrenType,
  isRoot: true,
};

export type SCXMLProps = z.infer<typeof scxmlConfig.propsSchema>;
