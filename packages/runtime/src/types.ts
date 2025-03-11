import type { z } from "zod";
import type { RunstepOutput } from "@fireworks/types";

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
