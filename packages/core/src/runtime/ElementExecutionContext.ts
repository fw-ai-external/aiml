import type {
  CoreAssistantMessage,
  CoreToolMessage,
  CoreUserMessage,
  UserContent,
} from "ai";
import { StepValue } from "./StepValue";
import { type RunstepOutput, type Secrets } from "../types";
// import type { TagNodeDTO } from "@fireworks/parser";
import { ChatCompletionMessageToolCall } from "../types/openai/chat";

type TagNodeDTO = any;
interface StepContext<T extends RunstepOutput> {
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

export type ElementExecutionContextSerialized = Record<string, any>;

export class ElementExecutionContext<
  PropValues extends {},
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

  async serialize() {
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
}
