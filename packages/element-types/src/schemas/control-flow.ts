import { z } from "zod";
import type { AllowedChildrenType, BaseElementDefinition } from "..";

/**
 * Control Flow Elements
 * These elements define the control flow and conditional logic in SCXML
 */

// If Element - Conditional execution
export const ifConfig: BaseElementDefinition = {
  tag: "if",
  propsSchema: z.object({
    id: z.string().optional(),
    cond: z.string(),
  }),
  description: "Conditional execution",
  allowedChildren: ["elseif", "else"] as AllowedChildrenType,
  documentation: "Conditional execution",
};

export type IfProps = z.infer<typeof ifConfig.propsSchema>;

// ElseIf Element - Alternative condition
export const elseIfConfig: BaseElementDefinition = {
  tag: "elseif",
  propsSchema: z.object({
    id: z.string().optional(),
    cond: z.string(),
  }),
  description: "Alternative condition",
  allowedChildren: "any" as AllowedChildrenType,
  documentation: "Alternative condition",
};

export type ElseIfProps = z.infer<typeof elseIfConfig.propsSchema>;

// Else Element - Default case
export const elseConfig: BaseElementDefinition = {
  tag: "else",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "Default case",
  allowedChildren: "any" as AllowedChildrenType,
  documentation: "Default case",
};

export type ElseProps = z.infer<typeof elseConfig.propsSchema>;

// ForEach Element - Array iteration
export const forEachConfig: BaseElementDefinition = {
  tag: "foreach",
  propsSchema: z.object({
    id: z.string().optional(),
    array: z.string(),
    item: z.string(),
    index: z.string().optional(),
  }),
  description: "Array iteration",
  allowedChildren: "any" as AllowedChildrenType,
  documentation: "Array iteration",
};

export type ForEachProps = z.infer<typeof forEachConfig.propsSchema>;

// Transition Element - State transitions
export const transitionConfig: BaseElementDefinition = {
  tag: "transition",
  propsSchema: z.object({
    id: z.string().optional(),
    event: z.string().optional(),
    cond: z.string().optional(),
    target: z.string().min(1),
  }),
  description: "State transitions",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "State transitions",
};

export type TransitionProps = z.infer<typeof transitionConfig.propsSchema>;

// OnEntry Element - State entry actions
export const onEntryConfig: BaseElementDefinition = {
  tag: "onentry",
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: "State entry actions",
  allowedChildren: "any" as AllowedChildrenType,
  documentation: "State entry actions",
};

export type OnEntryProps = z.infer<typeof onEntryConfig.propsSchema>;

// OnExit Element - State exit actions
export const onExitConfig: BaseElementDefinition = {
  tag: "onexit",
  propsSchema: z.object({
    id: z.string(),
  }),
  description: "State exit actions",
  allowedChildren: "any" as AllowedChildrenType,
  documentation: "State exit actions",
};

export type OnExitProps = z.infer<typeof onExitConfig.propsSchema>;
