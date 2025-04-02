import { z } from "zod";
import type { AllowedChildrenType, BaseElementDefinition } from "../../types";
import { elementExpressionCallbackSchema } from "../../utils/zod";

/**
 * Action Elements
 * These elements define executable actions in SCXML
 */

// Assign Element - Modifies the data model
export const assignConfig: BaseElementDefinition = {
  tag: "assign",
  elementType: "assign",
  role: "action",
  propsSchema: z.object({
    id: z.string().optional(),
    location: z.string(),
    expr: elementExpressionCallbackSchema,
  }),
  description: "Modifies the data model",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "Modifies the data model",
};

export type AssignProps = z.infer<typeof assignConfig.propsSchema>;

// Log Element - Outputs messages
export const logConfig: BaseElementDefinition = {
  tag: "log",
  elementType: "log",
  role: "action",
  propsSchema: z.object({
    id: z.string().optional(),
    label: z.string().optional(),
    expr: elementExpressionCallbackSchema,
  }),
  description: "Outputs messages to the console or tracing span",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "Outputs messages to the console or tracing span",
};

export type LogProps = z.infer<typeof logConfig.propsSchema>;

// Script Element - Executes JavaScript code
export const scriptConfig: BaseElementDefinition = {
  tag: "script",
  elementType: "script",
  role: "action",
  propsSchema: z.object({
    id: z.string().optional(),
    src: z.string().optional(),
  }),
  description: "Executes JavaScript code",
  allowedChildren: "text" as AllowedChildrenType,
  documentation: "Executes JavaScript code",
};

export type ScriptProps = z.infer<typeof scriptConfig.propsSchema>;

// Cancel Element - Cancels a delayed event
export const cancelConfig: BaseElementDefinition = {
  tag: "cancel",
  elementType: "cancel",
  role: "action",
  propsSchema: z.object({
    id: z.string().optional(),
    sendid: z.string().optional(),
    sendidexpr: z.string().optional(),
  }),
  description: "Cancels a delayed event",
  allowedChildren: "none" as AllowedChildrenType,
  documentation:
    "Cancels a delayed event that was previously sent with a delay",
};

export type CancelProps = z.infer<typeof cancelConfig.propsSchema>;

// Raise Element - Raises an internal event
export const raiseConfig: BaseElementDefinition = {
  tag: "raise",
  elementType: "raise",
  role: "action",
  propsSchema: z.object({
    id: z.string().optional(),
    event: z.string().optional(),
    eventexpr: elementExpressionCallbackSchema,
  }),
  description: "Raises an internal event",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "Raises an internal event for the state machine to process",
};

export type RaiseProps = z.infer<typeof raiseConfig.propsSchema>;

// Send Element - Sends an event to an external system
export const sendConfig: BaseElementDefinition = {
  tag: "send",
  elementType: "send",
  role: "action",
  propsSchema: z.object({
    id: z.string().optional(),
    event: z.string().optional(),
    eventexpr: elementExpressionCallbackSchema,
    target: z.string().optional(),
    targetexpr: elementExpressionCallbackSchema,
    type: z.string().optional(),
    typeexpr: elementExpressionCallbackSchema,
    delay: z.string().optional(),
    delayexpr: elementExpressionCallbackSchema,
    namelist: z.string().optional(),
  }),
  description: "Sends an event to an external system",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "Sends an event to an external system or service",
};

export type SendProps = z.infer<typeof sendConfig.propsSchema>;
