/**
 * ExecutionGraphElement - Represents a single node in the runtime execution graph.
 */
export interface ExecutionGraphElement {
  /**
   * Unique identifier for referencing in dependsOn or for cross-references.
   */
  id: string;

  /**
   * "step" or "action".
   * - "step" => a control-flow node that may have children (e.g. sequence, parallel, state, etc.)
   * - "action" => an executable operation node (log, assign, script, etc.)
   * - "shadow" => a control-flow node that does not execute, but is used to track dependencies.
   *   (e.g. parallelDone, historyDone, etc.)
   */
  type: "step" | "action" | "shadow";

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
