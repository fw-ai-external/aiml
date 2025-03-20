/**
 * Element Utilities
 *
 * This module provides utility functions for working with elements,
 * particularly for handling the conversion between error objects and StepValue instances.
 */

import { StepValue, ErrorCode } from "@fireworks/shared";
import type { StepValueResult } from "@fireworks/types";

/**
 * Creates a StepValue from an error object or converts a raw error object to a StepValue.
 * This function is used by the runtime to convert error objects from element-core into StepValue instances.
 *
 * @param errorOrValue Either an error object with type, code, and error properties, or a value to wrap in a StepValue
 * @returns A StepValue instance containing the error or value
 */
export function createStepValue<T extends StepValueResult = StepValueResult>(
  errorOrValue: any
): StepValue<T> {
  // If it's already a StepValue, return it
  if (errorOrValue instanceof StepValue) {
    return errorOrValue as StepValue<T>;
  }

  // If it's an error object with the expected structure
  if (
    errorOrValue &&
    typeof errorOrValue === "object" &&
    errorOrValue.type === "error" &&
    typeof errorOrValue.error === "string"
  ) {
    return new StepValue<T>({
      code: errorOrValue.code || ErrorCode.SERVER_ERROR,
      error: errorOrValue.error,
      type: "error",
    });
  }

  // Otherwise, treat it as a regular value
  return new StepValue<T>(errorOrValue);
}

/**
 * Wraps the execution of an element to ensure proper StepValue handling.
 * This function is used by the runtime to ensure that all element executions
 * return StepValue instances, even if the element returns a raw error object.
 *
 * @param executeFunc The element execution function
 * @param context The execution context
 * @param childrenNodes The children nodes
 * @returns A StepValue instance
 */
export async function wrapElementExecution<
  T extends StepValueResult = StepValueResult,
>(
  executeFunc: (context: any, childrenNodes: any[]) => Promise<any>,
  context: any,
  childrenNodes: any[] = []
): Promise<StepValue<T>> {
  try {
    const result = await executeFunc(context, childrenNodes);
    return createStepValue<T>(result.result || result);
  } catch (error) {
    console.error("Error executing element:", error);
    return new StepValue<T>({
      code: ErrorCode.SERVER_ERROR,
      error: error instanceof Error ? error.message : String(error),
      type: "error",
    });
  }
}
