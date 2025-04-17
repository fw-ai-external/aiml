import { z } from "zod";
import type {
  ElementDefinition,
  AllowedChildrenType,
  BaseElementDefinition,
} from "../../types";

// Workflow Element - Root workflow element
export const workflowConfig: BaseElementDefinition = {
  tag: "workflow",
  type: "state",
  subType: "user-input",
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

// Schema for initial element
export const initialConfig: ElementDefinition = {
  tag: "initial",
  type: "param",
  propsSchema: z.object({}) as z.ZodObject<any>,
  description: "Represents the initial state of a state machine",
  documentation:
    "The initial element represents the default initial state for a state machine or compound state.",
};

// Schema for history element
export const historyConfig: ElementDefinition = {
  tag: "history",
  type: "state",
  propsSchema: z.object({
    id: z.string().optional(),
    type: z.enum(["shallow", "deep"]).optional(),
  }) as z.ZodObject<any>,
  description: "Represents a history pseudo-state",
  documentation:
    "The history element represents a pseudo-state that remembers the last active state configuration.",
};

// Schema for donedata element
export const donedataConfig: ElementDefinition = {
  tag: "donedata",
  type: "action",
  allowedChildren: ["content", "param"],
  propsSchema: z.object({}) as z.ZodObject<any>,
  description:
    "Specifies the data to be returned when a state machine reaches its final state",
  documentation:
    "The donedata element is used to return data when a <final> state is entered.",
};

// Schema for content element
export const contentConfig: ElementDefinition = {
  tag: "content",
  type: "action",
  allowedChildren: "text",
  propsSchema: z.object({
    expr: z.string().optional(),
  }) as z.ZodObject<any>,
  description: "Specifies the content to be passed to parent state machine",
  documentation:
    "The content element defines the content that is returned when a state machine completes.",
};

// Schema for param element
export const paramConfig: ElementDefinition = {
  tag: "param",
  type: "param",
  allowedChildren: "none",
  propsSchema: z.object({
    name: z.string(),
    expr: z.string().optional(),
    location: z.string().optional(),
  }) as z.ZodObject<any>,
  description: "Specifies parameters to be passed to an invoked service",
  documentation:
    "The param element defines a parameter to be passed to an invoked service.",
};

// Schema for invoke element
export const invokeConfig: ElementDefinition = {
  tag: "invoke",
  type: "action",
  allowedChildren: ["content", "param", "finalize"],
  propsSchema: z.object({
    id: z.string().optional(),
    type: z.string(),
    src: z.string().optional(),
    autoforward: z.boolean().optional(),
    namelist: z.string().optional(),
  }) as z.ZodObject<any>,
  description: "Invokes an external service",
  documentation:
    "The invoke element is used to create an instance of an external service.",
};

// Schema for finalize element
export const finalizeConfig: ElementDefinition = {
  tag: "finalize",
  type: "action",
  allowedChildren: ["script", "assign", "raise", "if", "foreach", "log"],
  propsSchema: z.object({}) as z.ZodObject<any>,
  description:
    "Contains executable content to be executed when the invoked process returns",
  documentation:
    "The finalize element defines actions to be executed when an invoked service returns data.",
};
