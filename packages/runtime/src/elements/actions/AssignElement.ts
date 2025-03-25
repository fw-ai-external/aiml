import { type AssignProps, assignConfig } from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
import type { ElementExecutionContext } from "../../ElementExecutionContext";
import type { BuildContext } from "../../graphBuilder/Context";
import type { ExecutionReturnType } from "../../types";
import { createElementDefinition } from "../createElementFactory";

/**
 * Resolves the value to assign from either an expression or input
 */
async function resolveAssignValue(
  ctx: InstanceType<typeof ElementExecutionContext<AssignProps>>,
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
  tag: "assign" as const,
  role: "action" as const,
  elementType: "assign" as const,
  allowedChildren: "none" as const,

  onExecutionGraphConstruction(buildContext: BuildContext) {
    return {
      id: buildContext.attributes.id,
      key: buildContext.attributes.id ?? uuidv4(),
      type: "action",
      subType: "assign",
      attributes: {
        ...buildContext.attributes, // location, expr, etc.
      },
    };
  },

  async execute(ctx): Promise<ExecutionReturnType> {
    const { location, expr } = ctx.props;

    // Get the value to assign - either from expression or input
    const value = await resolveAssignValue(ctx as any, expr);

    try {
      // Validate the value and check if it can be assigned
      ctx.datamodel.set(location, value);
      return {
        result: ctx.input,
      };
    } catch (error) {
      return {
        result: ctx.input,
        exception: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
});
