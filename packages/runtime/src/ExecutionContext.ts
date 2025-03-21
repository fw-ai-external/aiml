/**
 * Execution Context Module
 *
 * This module provides the execution context for elements.
 * It separates the execution context from the element definition.
 */

import type {
  CoreAssistantMessage,
  CoreToolMessage,
  CoreUserMessage,
  UserContent,
} from "ai";
import { StepValue } from "./StepValue";
import { BaseElement } from "./elements/BaseElement";
import {
  ScopedDataModel,
  type StepValueResult,
  type Secrets,
  SerializedBaseElement,
} from "@fireworks/shared";
import { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
import { container, ServiceIdentifiers } from "./di";
import { hydreateElementTree } from "./hydrateElementTree";
import { createScopedDataModel } from "./elements";

type TagNodeDTO = any;

/**
 * Step context for execution
 */
export interface StepContext<T extends StepValueResult> {
  input: StepValue<T>;
  datamodel: Record<string, any>;
  state: {
    id: string;
    attributes: Record<string, any>;
    input: StepValue<T>;
  };
  stepResults: Record<string, any>;
  triggerData: Record<string, any>;
  attempts: Record<string, number>;
  getStepPayload: () => any;
}

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
    "workflowInput",
    "datamodel",
    "attributes",
    "state",
    "run",
    "context",
  ];

  // Input into the active element via the output of the last
  input: StepValue<InputValue>;
  // Input into the machine from the Request
  workflowInput: {
    userMessage: UserContent;
    systemMessage?: string;
    chatHistory: Array<
      CoreUserMessage | CoreAssistantMessage | CoreToolMessage
    >;
    clientSideTools: ChatCompletionMessageToolCall.Function[];
  };
  datamodel: Record<string, any>;
  attributes: PropValues & { children?: TagNodeDTO[] } = {} as PropValues;

  state: {
    id: string;
    attributes: Record<string, any>;
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
  private _scopedDataModel?: ScopedDataModel;

  constructor(params: {
    input: StepValue<InputValue>;
    workflowInput: {
      userMessage: UserContent;
      systemMessage?: string;
      chatHistory: Array<
        CoreUserMessage | CoreAssistantMessage | CoreToolMessage
      >;
      clientSideTools: ChatCompletionMessageToolCall.Function[];
      secrets: Secrets;
    };
    datamodel: Record<string, any>;
    attributes: PropValues;
    state: {
      id: string;
      attributes: Record<string, any>;
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
    this.workflowInput = params.workflowInput;

    // Create a scoped data model if an element is provided
    if (params.element) {
      const parentDataModel = params.parentContext?._scopedDataModel;

      // Create a scoped data model for this element
      this._scopedDataModel = createScopedDataModel(
        params.element.id,
        params.datamodel,
        params.datamodel.__metadata as Record<string, any>,
        parentDataModel
      );

      // Create a proxy for the datamodel that enforces scoping rules
      this.datamodel = this._createDataModelProxy(
        this._scopedDataModel,
        params.element.id
      );
    } else {
      // If no element is provided, use the datamodel as is
      this.datamodel = params.datamodel;
    }

    this.machine = params.machine;
    this.run = params.run;
    this.attributes = params.attributes ?? ({} as PropValues);
    this.state = params.state;

    // Initialize StepExecutionContext properties
    this.runId = params.run.id;

    this.suspend = async () => {
      // Implementation for suspend
    };
  }

  /**
   * Creates a proxy for the datamodel that enforces scoping rules
   */
  private _createDataModelProxy(
    scopedModel: ScopedDataModel,
    elementId: string
  ): Record<string, any> {
    return new Proxy(
      {},
      {
        get(target, prop) {
          const key = String(prop);

          // Special case for __metadata
          if (key === "__metadata") {
            return scopedModel.getAllMetadata();
          }

          return scopedModel.get(key);
        },

        set(target, prop, value) {
          const key = String(prop);

          // Don't allow setting __metadata directly
          if (key === "__metadata") {
            console.warn("Cannot set __metadata directly");
            return false;
          }

          try {
            return scopedModel.set(key, value);
          } catch (error) {
            console.error(`Error setting ${key}:`, error);
            return false;
          }
        },

        has(target, prop) {
          const key = String(prop);
          return scopedModel.has(key);
        },

        ownKeys() {
          // Return all accessible variables
          const allVars = scopedModel.getAllVariables();
          return Object.keys(allVars);
        },

        getOwnPropertyDescriptor(target, prop) {
          const key = String(prop);
          if (scopedModel.has(key)) {
            return {
              value: scopedModel.get(key),
              writable: !scopedModel.getMetadata(key)?.readonly,
              enumerable: true,
              configurable: true,
            };
          }
          return undefined;
        },
      }
    );
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
        return [key, await value.value()];
      }
      if (value instanceof BaseElement) {
        return [key, value.toJSON()];
      }
      if (value instanceof WeakRef) {
        return [key, value.deref()?.toJSON()];
      }
      return [key, value];
    });
    return Object.fromEntries(await Promise.all(entries));
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
   * Create a child execution context
   * @param childAttributes The child attributes
   * @param childInput The child input
   * @param element The element for which to create the context
   * @returns The child execution context
   */
  createChildContext<ChildProps extends {}, ChildInput extends StepValueResult>(
    childAttributes: ChildProps,
    childInput: StepValue<ChildInput>,
    element?: BaseElement
  ): ExecutionContext<ChildProps, ChildInput> {
    return new ExecutionContext<ChildProps, ChildInput>({
      input: childInput,
      workflowInput: {
        ...this.workflowInput,
        secrets: this.machine.secrets,
      },
      datamodel: this.datamodel,
      attributes: childAttributes,
      state: {
        ...this.state,
        input: childInput as any,
      },
      machine: this.machine,
      run: this.run,
      element,
      parentContext: this,
    });
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
      workflowInput: {
        ...serialized.workflowInput,
        secrets: serialized.machine.secrets,
      },
      datamodel: serialized.datamodel,
      attributes: serialized.attributes,
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

/**
 * Execution context factory
 */
export class ExecutionContextFactory {
  /**
   * Create an execution context
   * @param params The execution context parameters
   * @returns The execution context
   */
  createContext<
    PropValues extends {} = {},
    InputValue extends StepValueResult = StepValueResult,
  >(params: {
    input: StepValue<InputValue>;
    workflowInput: {
      userMessage: UserContent;
      systemMessage?: string;
      chatHistory: Array<
        CoreUserMessage | CoreAssistantMessage | CoreToolMessage
      >;
      clientSideTools: ChatCompletionMessageToolCall.Function[];
      secrets: Secrets;
    };
    datamodel: Record<string, any>;
    attributes: PropValues;
    state: {
      id: string;
      attributes: Record<string, any>;
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
  }): ExecutionContext<PropValues, InputValue> {
    return new ExecutionContext<PropValues, InputValue>(params);
  }

  /**
   * Create an execution context from a serialized context
   * @param serialized The serialized execution context
   * @returns The execution context
   */
  createFromSerialized<
    PropValues extends {} = {},
    InputValue extends StepValueResult = StepValueResult,
  >(
    serialized: ElementExecutionContextSerialized,
    element?: BaseElement,
    parentContext?: ExecutionContext<any, any>
  ): ExecutionContext<PropValues, InputValue> {
    // Create a StepValue from the serialized input
    const input = new StepValue(serialized.input);
    const stateInput = new StepValue(serialized.state.input);

    return new ExecutionContext<PropValues, InputValue>({
      input: input as StepValue<InputValue>,
      workflowInput: {
        ...serialized.workflowInput,
        secrets: serialized.machine.secrets,
      },
      datamodel: serialized.datamodel,
      attributes: serialized.attributes as PropValues,
      state: {
        id: serialized.state.id,
        attributes: serialized.state.attributes,
        input: stateInput as StepValue<InputValue>,
      },
      machine: serialized.machine,
      run: serialized.run,
      element,
      parentContext,
    });
  }
}

/**
 * Register the execution context factory
 */
export function registerExecutionContextFactory(): void {
  container.register(
    ServiceIdentifiers.EXECUTION_CONTEXT,
    new ExecutionContextFactory()
  );
}

/**
 * Get the execution context factory
 * @returns The execution context factory
 */
export function getExecutionContextFactory(): ExecutionContextFactory {
  return container.get<ExecutionContextFactory>(
    ServiceIdentifiers.EXECUTION_CONTEXT
  );
}

// For backward compatibility
export const ElementExecutionContext = ExecutionContext;
