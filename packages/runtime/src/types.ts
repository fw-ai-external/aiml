import { TextStreamPart, ObjectStreamPart } from "ai";
import { StepValue } from "./StepValue";
import { ElementDefinition } from "@fireworks/shared";
import { BaseElement } from "./elements/BaseElement";
import { z } from "zod";
import { BuildContext } from "./graphBuilder/Context";
import { ElementExecutionContext } from "./ElementExecutionContext";
// Define ErrorResult locally to avoid circular dependency
export interface ErrorResult {
  type: "error";
  error: string | number | any;
  code: string;
}

/**
 * ExecutionGraphElement - Represents a single node in the runtime execution graph.
 */
export interface ExecutionGraphElement {
  /**
   * Unique identifier provided by the user.
   */
  id: string;
  /**
   * Unique identifier for every element, even if an id is not provided by the user or supported by the element.
   */
  key: string;

  /**
   * "step" or "action".
   * - "step" => a control-flow node that may have children (e.g. sequence, parallel, state, etc.)
   * - "action" => an executable operation node (log, assign, script, etc.)
   * - "shadow" => a control-flow node that does not execute, but is used to track dependencies.
   *   (e.g. parallelDone, historyDone, etc.)
   */
  type: "state" | "action" | "error" | "user-input" | "output";

  /**
   * subType clarifies the exact kind of step/action, e.g.
   *   - "scxml", "state", "parallel", "final", "history" for step
   *   - "transition", "log", "assign", "script", "send", "invoke" etc. for action
   */
  subType: string;

  /**
   * Arbitrary set of key-value pairs storing original SCXML attributes
   * (id, event, cond, location, etc.), and any additional runtime config.
   */
  attributes: Record<string, any>;

  /**
   * Optional expression that, if false, means we skip this node at runtime.
   */
  when?: string;

  /**
   * List of other node IDs that must complete before this node can run.
   * Used for complex flow with multi-joins or ordering constraints.
   */
  runAfter?: string[];

  /**
   * If this is a "step" that can have nested structure, we store them here.
   * "action" nodes usually do not have children.
   */
  next?: ExecutionGraphElement[];

  /**
   * If this is a "step" that can have nested structure, we store them here.
   * "action" nodes usually do not have children.
   */
  parallel?: ExecutionGraphElement[];
}

export type TOOLS = {
  [key: string]: {
    parameters: any;
    description: string;
  };
};

/**
 * StepValueChunk - Chunk of a step value.
 * based on the normalized data in the AI SDK from vercel
 */
export type StepValueChunk =
  | Omit<
      TextStreamPart<TOOLS>,
      | "experimental_providerMetadata"
      | "providerMetadata"
      | "experimental_providerMetadata"
      | "response"
    >
  | Omit<ObjectStreamPart<any>, "response" | "providerMetadata">;

export interface ExecutionReturnType {
  result: StepValue;
  contextUpdate?: Record<string, any>;
  exception?: Error;
}
export type RuntimeElementDefinition<
  PropsSchema extends z.ZodObject<any> = z.ZodObject<
    {
      id: z.ZodOptional<z.ZodString>;
    } & Record<string, z.ZodTypeAny>
  >,
  Props extends z.infer<PropsSchema> = z.infer<PropsSchema>,
> = ElementDefinition<PropsSchema, Props> & {
  execute?: (
    ctx: InstanceType<typeof ElementExecutionContext<Props>>,
    childrenNodes: BaseElement[]
  ) => Promise<ExecutionReturnType>;
  render?: (
    ctx: InstanceType<typeof ElementExecutionContext<Props>>,
    childrenNodes: BaseElement[]
  ) => Promise<any>;
  enter?: () => Promise<void>;
  exit?: () => Promise<void>;
  onExecutionGraphConstruction?: (
    buildContext: BuildContext
  ) => ExecutionGraphElement;
};
