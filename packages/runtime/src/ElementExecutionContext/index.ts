/**
 * Execution Context Module
 *
 * This module provides the execution context for elements.
 * It separates the execution context from the element definition.
 */

import type {
  Secrets,
  SerializedBaseElement,
  StepValueResult,
} from "@fireworks/shared";
import type {
  CoreAssistantMessage,
  CoreToolMessage,
  CoreUserMessage,
  UserContent,
} from "ai";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
import { StepValue } from "../StepValue";
import type { BaseElement } from "../elements/BaseElement";
import { hydreateElementTree } from "../hydrateElementTree";
import type { ScopedDataModelRegistry } from "../DataModelRegistry";
import { isErrorResult } from "@fireworks/shared";
/**
 * Serialized execution context
 */
export type ElementExecutionContextSerialized = Omit<
  InstanceType<typeof ExecutionContext>,
  | "serialize"
  | "builtinKeys"
  | "_scopedDataModel"
  | "_createDataModelProxy"
  | "createChildContext"
  | "hydrate"
  | "element"
  | "toJSON"
  | "toString"
> & {
  element?: SerializedBaseElement;
  parentContext?: ElementExecutionContextSerialized;
  inputAsText: string;
};

/**
 * Execution context for elements
 */
export class ExecutionContext<
  PropValues extends {} = {},
  InputValue extends StepValueResult = StepValueResult,
> {
  // Static property for built-in keys that should match the serialized output
  static builtinKeys = [
    "input",
    "requestInput",
    "datamodel",
    "props",
    "state",
    "run",
    "machine",
  ];

  // Input into the active element via the output of the last
  input: StepValue<InputValue>;
  // Input into the machine from the Request
  requestInput: {
    userMessage: UserContent;
    systemMessage?: string;
    chatHistory: Array<
      CoreUserMessage | CoreAssistantMessage | CoreToolMessage
    >;
    clientSideTools: ChatCompletionMessageToolCall.Function[];
    secrets: Secrets;
  };
  datamodel: ScopedDataModelRegistry;
  props: PropValues & { children?: BaseElement[] } = {} as PropValues;

  state: {
    id: string;
    props: Record<string, any>;
    // input into the nearest parent state
    input: StepValue<InputValue>;
  };

  machine: {
    id: string;
    secrets: Secrets;
  };
  run: {
    id: string;
  };

  element?: BaseElement;
  parentContext?: ExecutionContext<any, any>;

  // Required by StepExecutionContext
  runId: string;
  suspend: () => Promise<void>;

  // Store the scoped data model for child contexts to access
  private _scopedDataModel?: ScopedDataModelRegistry;

  constructor(params: {
    input: StepValue<InputValue>;
    requestInput: {
      userMessage: UserContent;
      systemMessage?: string;
      chatHistory: Array<
        CoreUserMessage | CoreAssistantMessage | CoreToolMessage
      >;
      clientSideTools: ChatCompletionMessageToolCall.Function[];
      secrets: Secrets;
    };
    datamodel: ScopedDataModelRegistry;
    props: PropValues;
    state: {
      id: string;
      props: Record<string, any>;
      input: StepValue<InputValue>;
    };
    machine: {
      id: string;
      secrets: Secrets;
    };
    run: {
      id: string;
    };
    element?: BaseElement;
    parentContext?: ExecutionContext<any, any>;
  }) {
    // TODO: validate input using input schema
    this.input = params.input;
    this.requestInput = params.requestInput;

    this.machine = params.machine;
    this.run = params.run;
    this.props = params.props ?? ({} as PropValues);
    this.state = params.state;

    // Initialize StepExecutionContext properties
    this.runId = params.run.id;
    this.datamodel = params.datamodel;
    this.suspend = async () => {
      // Implementation for suspend
    };
  }

  private async simpleValue() {
    const value = await this.input.value();
    if (isErrorResult(value)) {
      return value;
    }
    if (value.text) return value.text;
    if (value.object) return value.object;
    if (value.items) return value.items;
    if (value.toolCalls) return value.toolCalls;
    if (value.toolResults) return value.toolResults;
    return value;
  }

  private async simpleValueAsText() {
    const value = await this.input.value();
    if (isErrorResult(value)) {
      return value;
    }
    if (value.text) return value.text;
    if (value.object) return JSON.stringify(value.object);
    if (value.items) return value.items.map((item) => item.text).join("\n");
    if (value.toolCalls)
      return value.toolCalls.map((toolCall) => toolCall.toolName).join("\n");
    if (value.toolResults)
      return value.toolResults
        .map((toolResult) => {
          try {
            return JSON.stringify(toolResult);
          } catch (e) {
            console.error("Error stringifying tool result", toolResult, e);
            return "";
          }
        })
        .join("\n");
    return value;
  }
  /**
   * Serialize the execution context
   * @returns The serialized execution context
   */
  async serialize() {
    // return all properties that are not methods. if the value is a StepValue, use the value() method
    const serialized = Object.fromEntries(
      Object.entries(this).filter(([key, value]) => {
        return typeof value !== "function";
      })
    );
    // if the value is a StepValue, use the serialize() method
    const entries = Object.entries(serialized).map(async ([key, value]) => {
      if (value instanceof StepValue) {
        return [key, await value.simpleValue()];
      }
      if ((value as BaseElement)?.onExecutionGraphConstruction) {
        return [key, value.toJSON()];
      }
      if (value instanceof WeakRef) {
        return [key, value.deref()?.toJSON()];
      }
      if (!ExecutionContext.builtinKeys.includes(key)) return [null, null];
      return [key, value];
    });

    return Object.fromEntries(
      (await Promise.all(entries))
        .filter(([key]) => key !== null)
        .concat([["inputAsText", await this.simpleValueAsText()]])
    );
  }

  toJSON() {
    throw new Error(
      "ExecutionContext cannot be by JSON.stringify, you must use the async serialize() method"
    );
  }

  toString() {
    throw new Error(
      "ExecutionContext cannot be by JSON.stringify, you must use the async serialize() method"
    );
  }

  /**
   * Deserialize the execution context
   * @param serialized The serialized execution context
   * @returns The deserialized execution context
   */
  static hydrate(
    serialized: ElementExecutionContextSerialized
  ): ExecutionContext<any, any> {
    return new ExecutionContext<any, any>({
      input: new StepValue(serialized.input),
      datamodel: serialized.datamodel,
      requestInput: {
        ...serialized.requestInput,
        secrets: serialized.machine.secrets,
      },
      props: serialized.props,
      state: serialized.state,
      machine: serialized.machine,
      run: serialized.run,
      element: serialized.element
        ? hydreateElementTree([serialized.element])
        : undefined,
      parentContext: serialized.parentContext,
    });
  }
}

// For backward compatibility
export const ElementExecutionContext = ExecutionContext;
