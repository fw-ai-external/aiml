import { z } from "zod";
import type { AllowedChildrenType, BaseElementDefinition } from "../../types";

/**
 * State Elements
 * These elements define the various state types in SCXML
 */

// State Element - Standard state in SCXML
export const stateConfig: BaseElementDefinition = {
  tag: "state",
  type: "state",
  subType: "other",
  propsSchema: z.object({
    id: z.string().optional(),
    initial: z.string().optional(),
  }),
  description: "A standard state in the state machine",
  allowedChildren: [
    "onentry",
    "onexit",
    "transition",
    "state",
    "parallel",
    "final",
    "history",
    "datamodel",
    "invoke",
    "data",
  ] as AllowedChildrenType,
  documentation:
    "A standard state in the state machine, can contain child states to form a compound state",
};

export type StateProps = z.infer<typeof stateConfig.propsSchema>;

// Parallel Element - Parallel state composition
export const parallelConfig: BaseElementDefinition = {
  tag: "parallel",
  type: "state",
  subType: "parallel",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "A state for parallel execution of child states",
  allowedChildren: [
    "onentry",
    "onexit",
    "transition",
    "state",
    "history",
    "datamodel",
    "invoke",
  ] as AllowedChildrenType,
  documentation:
    "Enables parallel execution of multiple states, used for concurrent state machines",
};

export type ParallelProps = z.infer<typeof parallelConfig.propsSchema>;

// Final Element - Terminal state
export const finalConfig: BaseElementDefinition = {
  tag: "final",
  type: "state",
  subType: "output",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "A final (terminal) state",
  allowedChildren: ["onentry", "donedata"] as AllowedChildrenType,
  documentation:
    "A terminal state indicating the completion of a region in the state machine",
};

export type FinalProps = z.infer<typeof finalConfig.propsSchema>;

// Export a type for all state-related schemas
export type StateSchemas = {
  state: typeof stateConfig.propsSchema;
  parallel: typeof parallelConfig.propsSchema;
  final: typeof finalConfig.propsSchema;
};

// Export a type for all state-related allowed children
export type StateAllowedChildren = {
  state: typeof stateConfig.allowedChildren;
  parallel: typeof parallelConfig.allowedChildren;
  final: typeof finalConfig.allowedChildren;
};
