import type { z } from "zod";
import type { RunstepOutput } from "./runtime";

export interface ErrorResult {
  type: "error";
  error: string;
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

export type RunStepInput = string | RunstepOutput | any;

export interface APIStreamEvent {
  type: string;
  [key: string]: any;
}

export interface ToolCall<Name extends string = string, Args = any> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  type: "tool-call";
}

export const ToolCallSchema = {} as z.ZodType<ToolCall>;

export type Secrets = Record<string, any>;

export type RunEvent = {
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
  event: APIStreamEvent;
};
