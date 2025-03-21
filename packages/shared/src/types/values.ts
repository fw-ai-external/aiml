import { TextStreamPart, ObjectStreamPart, StepResult } from "ai";
import type { z } from "zod";

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
