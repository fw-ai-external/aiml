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
import { StepValue } from "@fireworks/shared";
import { type RunstepOutput, type Secrets } from "@fireworks/types";
import { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
import { container, ServiceIdentifiers } from "./di";

type TagNodeDTO = any;

/**
 * Step context for execution
 */
export interface StepContext<T extends RunstepOutput> {
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
export type ElementExecutionContextSerialized = Record<string, any>;

/**
 * Execution context for elements
 */
export class ExecutionContext<
  PropValues extends {} = {},
  InputValue extends RunstepOutput = RunstepOutput,
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

  // Required by StepExecutionContext
  runId: string;
  context: StepContext<InputValue>;
  suspend: () => Promise<void>;

  constructor(params: {
    input: StepValue<InputValue>;
    workflowInput: {
      userMessage: UserContent;
      systemMessage?: string;
      chatHistory: Array<
        CoreUserMessage | CoreAssistantMessage | CoreToolMessage
      >;
      clientSideTools: ChatCompletionMessageToolCall.Function[];
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
  }) {
    // TODO: validate input using input schema
    this.input = params.input;
    this.workflowInput = params.workflowInput;
    this.datamodel = params.datamodel;
    this.machine = params.machine;
    this.run = params.run;
    this.attributes = params.attributes ?? ({} as PropValues);
    this.state = params.state;

    // Initialize StepExecutionContext properties
    this.runId = params.run.id;
    this.context = {
      input: params.input,
      datamodel: params.datamodel,
      state: params.state,
      stepResults: {},
      triggerData: {},
      attempts: {},
      getStepPayload: () => ({}),
    };
    this.suspend = async () => {
      // Implementation for suspend
    };
  }

  /**
   * Serialize the execution context
   * @returns The serialized execution context
   */
  async serialize(): Promise<ElementExecutionContextSerialized> {
    return {
      input: await this.input.simpleValue(),
      workflowInput: this.workflowInput,
      datamodel: this.datamodel.values,
      attributes: this.attributes,
      state: {
        id: this.state.id,
        attributes: this.state.attributes,
        input: await this.state.input.simpleValue(),
      },
      run: this.run,
      context: this.context,
    };
  }

  /**
   * Create a child execution context
   * @param childAttributes The child attributes
   * @param childInput The child input
   * @returns The child execution context
   */
  createChildContext<ChildProps extends {}, ChildInput extends RunstepOutput>(
    childAttributes: ChildProps,
    childInput: StepValue<ChildInput>
  ): ExecutionContext<ChildProps, ChildInput> {
    return new ExecutionContext<ChildProps, ChildInput>({
      input: childInput,
      workflowInput: this.workflowInput,
      datamodel: this.datamodel,
      attributes: childAttributes,
      state: {
        ...this.state,
        input: childInput as any,
      },
      machine: this.machine,
      run: this.run,
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
    InputValue extends RunstepOutput = RunstepOutput,
  >(params: {
    input: StepValue<InputValue>;
    workflowInput: {
      userMessage: UserContent;
      systemMessage?: string;
      chatHistory: Array<
        CoreUserMessage | CoreAssistantMessage | CoreToolMessage
      >;
      clientSideTools: ChatCompletionMessageToolCall.Function[];
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
    InputValue extends RunstepOutput = RunstepOutput,
  >(
    serialized: ElementExecutionContextSerialized
  ): ExecutionContext<PropValues, InputValue> {
    // Create a StepValue from the serialized input
    const input = new StepValue(serialized.input);
    const stateInput = new StepValue(serialized.state.input);

    return new ExecutionContext<PropValues, InputValue>({
      input: input as StepValue<InputValue>,
      workflowInput: serialized.workflowInput,
      datamodel: serialized.datamodel,
      attributes: serialized.attributes,
      state: {
        id: serialized.state.id,
        attributes: serialized.state.attributes,
        input: stateInput as StepValue<InputValue>,
      },
      machine: serialized.machine,
      run: serialized.run,
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
