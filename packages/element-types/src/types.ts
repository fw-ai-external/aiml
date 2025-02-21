import { z } from "zod";
import type { ReactNode } from "react";

export type SCXMLNodeType =
  | "state"
  | "parallel"
  | "transition"
  | "final"
  | "history"
  | "datamodel"
  | "data"
  | "assign"
  | "donedata"
  | "content"
  | "param"
  | "script"
  | "raise"
  | "if"
  | "elseif"
  | "else"
  | "foreach"
  | "log"
  | "send"
  | "cancel"
  | "invoke"
  | "finalize"
  | "onentry"
  | "onexit";

export type ElementProps = Record<string, any>;

export type ElementConfig<T> = z.ZodObject<any>;

export type ElementExecutionContext<Props = ElementProps> = {
  attributes: Props;
  datamodel: Record<string, unknown>;
  workflowInput: {
    userMessage: string;
    chatHistory: Array<{ role: string; content: string }>;
    clientSideTools: Array<{
      name: string;
      description: string;
      parameters?: z.ZodObject<any>;
      execute?: (args: any) => Promise<any>;
    }>;
  };
  state: {
    id: string;
    attributes: Record<string, unknown>;
    input: any;
  };
  machine: {
    id: string;
    secrets: {
      system: Record<string, string>;
      user: Record<string, string>;
    };
  };
  run: {
    id: string;
  };
};

export type ElementRenderContext<Props = ElementProps> =
  ElementExecutionContext<Props>;

export type ElementRenderResult = Promise<ReactNode>;

export type StepValue<
  T = any,
  Type =
    | "object"
    | "tool-result"
    | "tool-call"
    | "text"
    | "merged-results"
    | "api-call"
    | "api-call-result"
    | "error",
> = {
  type: Type;
  value: T;
  raw?: string;
};
