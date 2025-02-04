import type {
  CoreAssistantMessage,
  CoreToolMessage,
  CoreUserMessage,
  UserContent,
} from "ai";
import { StepValue } from "./StepValue";
import { type RunstepOutput, type Secrets } from "../types";
import type { TagNodeDTO } from "../parser/types";
import { ChatCompletionMessageToolCall } from "../types/openai/chat";

export type StepContextSerialized = Record<string, any>;
export class StepContext<
  PropValues extends {},
  InputValue extends RunstepOutput = RunstepOutput,
> {
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
    };
  }
}
