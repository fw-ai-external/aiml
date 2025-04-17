import { logConfig } from "@fireworks/shared";
import { StepValue } from "../../StepValue";
import { createElementDefinition } from "../createElementFactory";

export const Log = createElementDefinition({
  ...logConfig,
  async execute(ctx) {
    const { label, expr } = ctx.props;

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
      // Message would normally be logged here

      return {
        result: new StepValue({
          type: "object",
          object: { message, value },
          raw: JSON.stringify({ message, value }),
        }),
      };
    } catch (error) {
      console.error(`Error in log element (${label}):`, error);
      throw error;
    }
  },
});
