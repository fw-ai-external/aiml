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
