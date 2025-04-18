import type { ElementDefinition } from "@aiml/shared";
import type { ObjectStreamPart, TextStreamPart } from "ai";
import type { z } from "zod";
import type { ElementExecutionContext } from "./ElementExecutionContext";
import type { StepValue } from "./StepValue";
import type { BaseElement } from "./elements/BaseElement";
import type { BuildContext } from "./graphBuilder/Context";
// Define ErrorResult locally to avoid circular dependency
export interface ErrorResult {
  type: "error";
  error: string | number | any;
  code: string;
}

export type TOOLS = {
  [key: string]: {
    parameters: any;
    description: string;
  };
};

/**
 * StepValueChunk - Chunk of a step value.
 * based on the normalized data in the AI SDK from vercel
 */
export type StepValueChunk =
  | Omit<
      TextStreamPart<TOOLS>,
      | "experimental_providerMetadata"
      | "providerMetadata"
      | "experimental_providerMetadata"
      | "response"
    >
  | Omit<ObjectStreamPart<any>, "response" | "providerMetadata">;

export interface ExecutionReturnType {
  result: StepValue;
  contextUpdate?: Record<string, any>;
  exception?: string;
}
export type RuntimeElementDefinition<
  PropsSchema extends z.ZodObject<any> = z.ZodObject<
    {
      id: z.ZodOptional<z.ZodString>;
    } & Record<string, z.ZodTypeAny>
  >,
  Props extends z.infer<PropsSchema> = z.infer<PropsSchema>,
> = ElementDefinition<PropsSchema, Props> & {
  execute?: (
    ctx: InstanceType<typeof ElementExecutionContext<Props>>,
    childrenNodes: BaseElement[]
  ) => Promise<ExecutionReturnType>;
  render?: (
    ctx: InstanceType<typeof ElementExecutionContext<Props>>,
    childrenNodes: BaseElement[]
  ) => Promise<any>;
  enter?: () => Promise<void>;
  exit?: () => Promise<void>;
  onExecutionGraphConstruction?: (buildContext: BuildContext) => void;
};
