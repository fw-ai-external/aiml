import { createElementDefinition, StepValue } from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
import { assignConfig, AssignProps } from "@fireworks/element-config";

export const Assign = createElementDefinition<AssignProps>({
  ...assignConfig,
  role: "action",
  elementType: "assign",
  allowedChildren: "none",
  onExecutionGraphConstruction(buildContext) {
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
  async execute(ctx) {
    const { location, expr } = ctx.attributes;

    if (!location) {
      throw new Error("Assign element requires a 'location' attribute");
    }

    // Create a function that evaluates the expression in the context of the datamodel
    const evaluateExpression = (expression: string) => {
      const fn = new Function(
        ...Object.keys(ctx.datamodel),
        `return ${expression}`
      );
      return fn(...Object.values(ctx.datamodel));
    };

    // If expr is provided, evaluate it and assign the result
    // Otherwise, use the text content as the value
    const value = expr ? evaluateExpression(expr) : ctx.input;

    // Update the datamodel at the specified location
    // ctx.updateContext(location, value);

    return new StepValue({
      type: "object",
      object: { location, value },
      raw: JSON.stringify({ location, value }),
    });
  },
});
