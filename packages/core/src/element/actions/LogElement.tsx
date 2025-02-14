import { createElementDefinition } from "../createElementDefinition";
import { StepValue } from "../../runtime/StepValue";
import { logConfig } from "@workflow/element-types";

export const Log = createElementDefinition({
  ...logConfig,
  onExecutionGraphConstruction(buildContext) {
    return {
      id: buildContext.attributes.id,
      key: buildContext.elementKey,
      type: "action",
      subType: "log",
      attributes: {
        ...buildContext.attributes, // { expr, label, etc. }
      },
    };
  },
  async execute(ctx) {
    const { label, expr } = ctx.attributes;

    try {
      // Create a function that evaluates the expression in the context of the datamodel
      const evaluateExpression = (expression: string) => {
        const fn = new Function(
          ...Object.keys(ctx.datamodel),
          `return ${expression}`
        );
        return fn(...Object.values(ctx.datamodel));
      };

      const value = evaluateExpression(expr);
      const message = label ? `${label}: ${value}` : String(value);
      console.log(message);

      return new StepValue({
        type: "object",
        object: { message, value },
        raw: JSON.stringify({ message, value }),
      });
    } catch (error) {
      console.error(`Error in log element (${label}):`, error);
      throw error;
    }
  },
});
