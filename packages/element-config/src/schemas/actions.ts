import { z } from "zod";
import type { AllowedChildrenType } from "@fireworks/types";
import type { BaseElementDefinition } from "../types";

/**
 * Action Elements
 * These elements define executable actions in SCXML
 */

// Assign Element - Modifies the data model
export const assignConfig: BaseElementDefinition = {
  tag: "assign",
  propsSchema: z.object({
    id: z.string().optional(),
    location: z.string(),
    expr: z.string().optional(),
  }),
  description: "Modifies the data model",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "Modifies the data model",
};

export type AssignProps = z.infer<typeof assignConfig.propsSchema>;

// Log Element - Outputs messages
export const logConfig: BaseElementDefinition = {
  tag: "log",
  propsSchema: z.object({
    id: z.string().optional(),
    label: z.string().optional(),
    expr: z.string(),
  }),
  description: "Outputs messages to the console or tracing span",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "Outputs messages to the console or tracing span",
};

export type LogProps = z.infer<typeof logConfig.propsSchema>;

// Send Element - Sends events and messages
export const sendConfig: BaseElementDefinition = {
  tag: "send",
  propsSchema: z.object({
    id: z.string().optional(),
    event: z.string().optional(),
    eventexpr: z.string().optional(),
    target: z.string().optional(),
    targetexpr: z.string().optional(),
    type: z.string().optional(),
    delay: z.string().optional(),
    delayexpr: z.string().optional(),
    namelist: z.string().optional(),
  }),
  description: "Sends events and messages to other agents",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "Sends events and messages to other agents",
};

export type SendProps = z.infer<typeof sendConfig.propsSchema>;

// Cancel Element - Cancels delayed events
export const cancelConfig: BaseElementDefinition = {
  tag: "cancel",
  propsSchema: z.object({
    id: z.string().optional(),
    sendid: z.string().optional(),
    sendidexpr: z.string().optional(),
  }),
  description: "Cancels delayed events",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "Cancels delayed events",
};

export type CancelProps = z.infer<typeof cancelConfig.propsSchema>;

// Raise Element - Raises internal events
export const raiseConfig: BaseElementDefinition = {
  tag: "raise",
  propsSchema: z.object({
    id: z.string().optional(),
    event: z.string(),
  }),
  description: "Raises internal events",
  allowedChildren: "none" as AllowedChildrenType,
  documentation: "Raises internal events",
};

export type RaiseProps = z.infer<typeof raiseConfig.propsSchema>;

// Script Element - Executes JavaScript code
export const scriptConfig: BaseElementDefinition = {
  tag: "script",
  propsSchema: z.object({
    id: z.string().optional(),
    src: z.string().optional(),
  }),
  description: "Executes JavaScript code",
  allowedChildren: "text" as AllowedChildrenType,
  documentation: "Executes JavaScript code",
};

export type ScriptProps = z.infer<typeof scriptConfig.propsSchema>;
