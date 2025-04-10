import { type StepValueResult, assignConfig } from "@fireworks/shared";
import type { ElementExecutionContext } from "../../ElementExecutionContext";
import type { ExecutionReturnType } from "../../types";
import { createElementDefinition } from "../createElementFactory";

/**
 * Resolves the value to assign from either an expression or input
 */
async function resolveAssignValue(
  ctx: ElementExecutionContext<
    {
      [x: string]: any;
    },
    StepValueResult
  >,
  expr?: string
): Promise<any> {
  // If expr is provided, evaluate it
  if (expr) {
    // Create a function that evaluates the expression in the context of the datamodel
    try {
      // Get all variables from the datamodel
      const variables = ctx.datamodel;

      // Create a function with the variables as parameters
      const fn = new Function(...Object.keys(variables), `return ${expr}`);

      // Call the function with the variable values
      return fn(...Object.values(variables));
    } catch (error) {
      console.error(`Error evaluating expression ${expr}:`, error);
      throw error;
    }
  }
  console.log("resolveAssignValue", ctx);

  // Otherwise use the input value
  const inputValue = await ctx.input.value();

  // If the input is a StepValue-like object, extract the text
  if (
    typeof inputValue === "object" &&
    inputValue !== null &&
    "text" in inputValue
  ) {
    return inputValue.text;
  }

  return inputValue;
}

export const Assign = createElementDefinition({
  ...assignConfig,
  async execute(ctx): Promise<ExecutionReturnType> {
    const { location, expr } = ctx.props;

    // Get the value to assign - either from expression or input
    const value = await resolveAssignValue(ctx, expr);

    // Validate the value and check if it can be assigned
    ctx.datamodel.set(location, value);
    return {
      result: ctx.input,
    };
  },
});
