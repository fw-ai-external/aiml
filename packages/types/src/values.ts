import { TextStreamPart, ObjectStreamPart } from "ai";

// Basic type for tool definitions
export type TOOLS = {
  [key: string]: {
    parameters: any;
    description: string;
  };
};

// Define StepValueChunk locally to avoid circular dependency
export type StepValueChunk =
  | Omit<
      TextStreamPart<TOOLS>,
      | "experimental_providerMetadata"
      | "providerMetadata"
      | "experimental_providerMetadata"
      | "response"
    >
  | Omit<ObjectStreamPart<any>, "response" | "providerMetadata">;

export interface ErrorResult {
  type: "error";
  error: string | number | any;
  code: string;
}

export interface JSONObject {
  [key: string]: any;
}

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type Secrets = Record<string, any>;

export type RunStreamEvent = {
  // The name of the step that produced the event
  step: string;
  // The uuid of the instance of  running step that produced the event
  // e.g. if a step is run 2x in one "Run", each instance will have a different uuid
  uuid: string;
  // The type of the step that produced the event
  type: string;
  // The id of the run that the event belongs to
  runId: string;
  // The event produced by the step
  event: StepValueChunk;
};
