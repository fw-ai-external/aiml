/**
 * Execution Context Module
 *
 * This module provides the execution context for elements.
 * It separates the execution context from the element definition.
 */

import type {
  ScopedDataModel,
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
import { createScopedDataModel } from "../elements/context/ScopedDataModel";
import type { BaseElement } from "../elements/BaseElement";
import { hydreateElementTree } from "../hydrateElementTree";

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
  datamodel: Record<string, any>;
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
  private _scopedDataModel?: ScopedDataModel;

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
    datamodel: Record<string, any>;
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
    this.props = params.props ?? ({} as PropValues);
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
      (await Promise.all(entries)).filter(([key]) => key !== null)
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
      requestInput: {
        ...this.requestInput,
        secrets: this.machine.secrets,
      },
      datamodel: this.datamodel,
      props: childAttributes,
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
      requestInput: {
        ...serialized.requestInput,
        secrets: serialized.machine.secrets,
      },
      datamodel: serialized.datamodel,
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
