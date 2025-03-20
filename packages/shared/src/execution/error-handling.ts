import { StepValue } from "../StepValue";
import type { StepValueResult, ExecutionReturnType } from "@fireworks/types";

/**
 * Creates a successful execution result
 */
export function createSuccessResult(
  result: StepValue<StepValueResult>,
  contextUpdate?: Record<string, any>
): ExecutionReturnType {
  return { result, contextUpdate };
}

/**
 * Creates an error execution result
 */
export function createErrorResult(
  input: StepValue<StepValueResult>,
  error: unknown
): ExecutionReturnType {
  return {
    result: input,
    exception: error instanceof Error ? error : new Error(String(error)),
  };
}
