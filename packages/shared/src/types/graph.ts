/**
 * ExecutionGraphElement - Represents a single node in the runtime execution graph.
 */
export interface ExecutionGraphElement extends Record<string, any> {
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
   * subType is used to further refine the type of the node.
   */
  subType?: "model" | "tool-call" | "human-input" | "code";

  /**
   * tag clarifies the exact kind of step/action, e.g.
   *   - "scxml", "state", "parallel", "final", "history" for step
   *   - "transition", "log", "assign", "script", "send", "invoke" etc. for action
   */
  tag: string;

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
   * The primary graph of the workflow. walking down each element, then any next or parallel elements.
   * typically this is only one element, if multiple, it is the same as saying after all decendents
   * of one index, run the next index
   */
  next?: ExecutionGraphElement[];

  /**
   * every parallel ExecutionGraphElement is a role of state and they are all executed in parallel
   *
   */
  parallel?: ExecutionGraphElement[];

  /**
   * The duration of the node in milliseconds.
   */
  duration?: number;

  /**
   * The scope of the node.
   */
  scope: ["root", ...string[]];

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
}
