import { type AssignProps, assignConfig } from "@fireworks/shared";
import { validateValueType } from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
import type { ElementExecutionContext } from "../../ElementExecutionContext";
import { StepValue } from "../../StepValue";
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

/**
 * Validates that the value can be assigned to the location
 * Checks type constraints and readonly status
 */
function validateAssignment(
  ctx: InstanceType<typeof ElementExecutionContext<AssignProps>>,
  location: string,
  value: any
): void {
  // Get metadata for type validation
  const metadata = ctx.datamodel.__metadata?.[location];

  // Validate the value against the type if metadata exists
  if (metadata) {
    validateValueType(value, metadata.type, metadata.schema);

    // Check if the variable is readonly
    if (metadata?.readonly) {
      throw new Error(`Cannot assign to readonly variable: ${location}`);
    }
  }
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

    // Validate location is provided
    if (!location) {
      // Create an error StepValue
      const errorResult = new StepValue({
        type: "error",
        code: "ASSIGN_ERROR",
        error: "Assign element requires a 'location' attribute",
      });

      return {
        result: errorResult,
        exception: new Error("Assign element requires a 'location' attribute"),
      };
    }

    try {
      // Check if the variable exists in the datamodel
      if (!(location in ctx.datamodel)) {
        // Create an error StepValue
        const errorResult = new StepValue({
          type: "error",
          code: "ASSIGN_ERROR",
          error: `Variable ${location} does not exist in datamodel`,
        });

        return {
          result: errorResult,
          exception: new Error(
            `Variable ${location} does not exist in datamodel`
          ),
        };
      }

      // Get the value to assign - either from expression or input
      const value = await resolveAssignValue(ctx as any, expr);

      try {
        // Validate the value and check if it can be assigned
        validateAssignment(ctx as any, location, value);
      } catch (error) {
        // Create an error StepValue for validation errors
        const errorResult = new StepValue({
          type: "error",
          code: "ASSIGN_ERROR",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          result: errorResult,
          exception: error instanceof Error ? error : new Error(String(error)),
        };
      }

      // Create a success StepValue with the assigned value
      const successResult = new StepValue({
        type: "object",
        object: {
          location,
          value,
        },
        raw: JSON.stringify({ location, value }),
      });

      // Return result with context update
      return {
        result: successResult,
        contextUpdate: { [location]: value },
      };
    } catch (error) {
      // Create an error StepValue for any other errors
      const errorResult = new StepValue({
        type: "error",
        code: "ASSIGN_ERROR",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        result: errorResult,
        exception: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
});
