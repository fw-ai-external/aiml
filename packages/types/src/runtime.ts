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

/**
 * BuildContext - Context for building execution graph elements.
 */
export interface BuildContext {
  workflow: any;
  readonly elementKey: string;
  children: any[];
  readonly attributes: Record<string, any>;
  readonly conditions: any;
  readonly spec: any;
  getElementByKey(key: string, childOf?: any): any | null;
  getCachedGraphElement(elementId: string): ExecutionGraphElement | undefined;
  setCachedGraphElement(
    elementId: string | string[],
    ege: ExecutionGraphElement
  ): void;
  createNewContextForChild(child: any): BuildContext;
  // No need to include private members in the interface
}

/**
 * ElementExecutionContext - Context for executing elements.
 */
export interface ElementExecutionContext<PropValues = any, InputValue = any> {
  input: InputValue;
  workflowInput: {
    userMessage: any;
    systemMessage?: string;
    chatHistory: Array<any>;
    clientSideTools: any[];
  };
  datamodel: Record<string, any>;
  attributes: PropValues & { children?: any[] };
  state: {
    id: string;
    attributes: Record<string, any>;
    input: any;
  };
  machine: {
    id: string;
    secrets: any;
  };
  run: {
    id: string;
  };
  runId: string;
  context: any;
  suspend: () => Promise<void>;
  serialize(): Promise<any>;
}

export type ElementExecutionContextSerialized = Record<string, any>;

/**
 * RunstepOutput - Output from a run step.
 */
export type RunstepOutput = {
  type: string;
  [key: string]: any;
};

// Note: StepValue is a class that's implemented in the @fireworks/shared package
// This is just the interface definition for type checking
export interface StepValue<
  Value extends RunstepOutput = RunstepOutput,
  Type extends RunstepOutput["type"] = RunstepOutput["type"],
> {
  readonly id: string;
  readonly runStepUUID: string | null;
  readonly stats: any | null;

  type(): Promise<"tool-call" | "text" | "object" | "error">;
  value(): Promise<Value | any>;
  simpleValue(): Promise<string | any | any[] | null>;
  valueAsText(): Promise<string | null>;
  text(): Promise<string | null>;
  object(): Promise<any | null>;
  toolCalls(): Promise<any>;
  stream(): Promise<ReadableStream<Uint8Array>>;
  error(): Promise<any | null>;
  streamIterator(): AsyncIterableIterator<any>;
}
