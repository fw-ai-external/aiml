import { z } from "zod";
import type { AllowedChildrenType, BaseElementDefinition } from "..";

/**
 * State Elements
 * These elements define the various state types in SCXML
 */

// State Element - Basic state container
export const stateConfig: BaseElementDefinition = {
  tag: "state",
  propsSchema: z.object({
    id: z.string(),
    initial: z.string().optional(),
  }),
  description: "Basic state container",
  allowedChildren: [
    "onentry",
    "onexit",
    "transition",
    "invoke",
    "state",
    "parallel",
    "final",
    "script",
    "assign",
    "if",
    "else",
    "elseif",
  ] as AllowedChildrenType,
  documentation: "Basic state container",
};

export type StateProps = z.infer<typeof stateConfig.propsSchema>;

// Parallel Element
export const parallelConfig: BaseElementDefinition = {
  tag: "parallel",
  propsSchema: z.object({
    id: z.string(),
  }),
  description: "Container for parallel states",
  allowedChildren: [
    "onentry",
    "onexit",
    "state",
    "parallel",
    "transition",
  ] as AllowedChildrenType,
  documentation: "Container for parallel states",
};

export type ParallelProps = z.infer<typeof parallelConfig.propsSchema>;

// Final Element
export const finalConfig: BaseElementDefinition = {
  tag: "final",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  allowedChildren: ["onentry", "onexit"] as AllowedChildrenType,
  description: "Represents a final state",
  documentation: "Represents a final state",
};

export type FinalProps = z.infer<typeof finalConfig.propsSchema>;

// History Element
export const historyConfig: BaseElementDefinition = {
  tag: "history",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  allowedChildren: ["onentry", "onexit"] as AllowedChildrenType,
  description: "Represents historical state information",
  documentation: "Represents historical state information",
};

export type HistoryProps = z.infer<typeof historyConfig.propsSchema>;

// Export a type for all state-related schemas
export type StateSchemas = {
  state: typeof stateConfig.propsSchema;
  parallel: typeof parallelConfig.propsSchema;
  final: typeof finalConfig.propsSchema;
  history: typeof historyConfig.propsSchema;
};

// Export a type for all state-related allowed children
export type StateAllowedChildren = {
  state: typeof stateConfig.allowedChildren;
  parallel: typeof parallelConfig.allowedChildren;
  final: typeof finalConfig.allowedChildren;
  history: typeof historyConfig.allowedChildren;
};
