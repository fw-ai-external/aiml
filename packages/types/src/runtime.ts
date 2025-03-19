import { TextStreamPart, StepResult, ObjectStreamPart } from "ai";
import { ErrorResult } from "./values";
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
  findElementByKey(key: string, childOf?: any): any | null;
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
 * StepValueResult - Input/Output from a step / state / element.
 * based on the normalized data in the AI SDK from vercel
 */
export type StepValueResultType =
  | "object"
  | "text"
  | "toolCalls"
  | "toolResults"
  | "items"
  | "error";
export type StepValueResult =
  | (Omit<
      StepResult<TOOLS>,
      | "request"
      | "response"
      | "providerMetadata"
      | "experimental_providerMetadata"
      | "stepType"
      | "isContinued"
      | "text"
      | "toolCalls"
      | "toolResults"
    > &
      (
        | {
            object: Record<string, any>;
            items?: undefined;
            text?: undefined;
            toolCalls?: undefined;
            toolResults?: undefined;
          }
        | {
            object?: undefined;
            items: any[];
            text?: undefined;
            toolCalls?: undefined;
            toolResults?: undefined;
          }
        | {
            object?: undefined;
            items?: undefined;
            text: string;
            toolCalls?: StepResult<TOOLS>["toolCalls"];
            toolResults: StepResult<TOOLS>["toolResults"];
          }
        | {
            object?: undefined;
            items?: undefined;
            text?: undefined;
            toolCalls?: undefined;
            toolResults: StepResult<TOOLS>["toolResults"];
          }
      ))
  | (ErrorResult & {
      object?: undefined;
      items?: undefined;
      text?: undefined;
      toolCalls?: undefined;
      toolResults?: undefined;
    });

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

export interface StepValue<Value extends StepValueResult = StepValueResult> {
  readonly id: string;
  readonly stepUUID: string | null;
  readonly stats: any | null;
  type(): Promise<StepValueResultType>;
  value(): Promise<Value | any>;
  text(): Promise<string | null>;
  object(): Promise<Record<string, any> | null>;
  toolCalls(): Promise<StepValueResult["toolCalls"]>;
  toolResults(): Promise<StepValueResult["toolResults"]>;
  stream(): Promise<ReadableStream<Uint8Array>>;
  error(): Promise<ErrorResult | null>;
  streamIterator(): AsyncIterableIterator<StepValueChunk>;
}
