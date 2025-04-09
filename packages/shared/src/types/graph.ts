import type { ElementSubType, ElementType } from "./elements";

export type StateStep = {
  id: string;
  type: "state";
  subType: "output" | "error" | "user-input" | "parallel" | "other";
};

export type ActionStep = {
  id?: undefined;
  type: "action";
  subType: "model" | "tool-call" | "human-input" | "code" | "transition";
};

export type ParamElement = {
  id?: undefined;
  type: "param";
  subType: "datamodel" | "prop";
};

export type BranchingStep = {
  id?: undefined;
  type: "branch";
  subType: "conditional";
};

/**
 * ExecutionGraphStep - Represents a single node in the runtime execution graph.
 */
export interface ExecutionGraphStep<
  Attributes extends Record<string, any> = Record<string, any>,
> extends Record<string, any> {
  /**
   * An optional human readable name for the node for debugging/tracing/logging.
   */
  name?: string;

  /**
   * An optional description for the node for debugging/tracing/logging.
   */
  description?: string;

  /**
   * Unique identifier provided by the user referenced in the graph.
   */
  id: string; // required for type: 'state', never for type: 'action'

  /**
   * Unique identifier auto generated for every element, even if an id is not provided by the user or supported by the element.
   * This is used to identify the element in the graph for uniqueness.
   */
  key: string;

  /**
   * "step" or "action".
   * - "step" => a control-flow node that may have children (e.g. sequence, parallel, state, etc.)
   * - "action" => an executable operation node (log, assign, script, etc.)
   *   (e.g. parallelDone, historyDone, etc.)
   */
  type: ElementType;

  /**
   * subType is used to further refine the type of the node.
   */
  subType: ElementSubType;

  /**
   * tag in the graph the exact kind of step/action, e.g.
   *   - "scxml", "state", "parallel", "final", "history" for step
   *   - "transition", "log", "assign", "script", "send", "invoke" etc. for action
   *
   * Think of it really as a sub-sub-type lol
   */
  tag: string;

  /**
   * Arbitrary set of key-value pairs storing original SCXML attributes
   * (id, event, cond, location, etc.), and any additional runtime config.
   */
  attributes: Attributes;

  /**
   * The scope of the node based on the ID of state type steps only unlike parentIds which is based on the key of any step type
   */
  scope: ["root", ...string[]];

  /**
   * Optional expression that, if false, means we skip this node at runtime.
   */
  when?: string;

  /**
   * Optional expression that, if false, means we skip this node and the children/branch of this node.
   */
  if?: string;

  /**
   * Optional expression that, if true, means we repeat this node at runtime until it returns false.
   */
  while?: string;

  /**
   * Optional expression that, if false, means we repeat this node at runtime until it returns true.
   */
  loopUntil?: string;

  /**
   * creates a suspension point in the workflow that waits for a specific event to be received before continuing execution.
   */
  waitFor?: {
    /**
     * The event to wait for.
     */
    eventName: string;

    /**
     * The payload schema to wait for. defined as a json schema.
     */
    payloadSchema?: Record<string, any>;
  };

  /**
   * List of other node IDs that must complete before this node can run.
   * Used for complex flow with multi-joins or ordering constraints.
   */
  runAfter?: string[];

  /**
   * The last element keys that were added to the graph.
   */
  lastElementKeys?: string[] | null;

  /**
   * Optional variables to be used in the node.
   */
  variables?: Record<string, any>;

  /**
   * The status of the node.
   */
  status?:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "skipped"
    | "streaming"
    | "waitingForStream";

  /**
   * The duration of the node in milliseconds that the node took to complete (so far).
   */
  duration?: number;
}
export type RunStep = SingleStep | ParallelSteps;

export type SingleStep = ExecutionGraphStep & {
  runParallel?: false;
  type: ElementType;
  subType: ElementSubType;
};

export type ParallelSteps = ExecutionGraphStep & {
  runParallel: true;
  steps: RunStep[][];
};

export type WorkflowGraph = RunStep[];
