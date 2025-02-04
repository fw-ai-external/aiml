import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";

const logSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  expr: z.string(),
});

export const Log = createElementDefinition({
  tag: "log",
  propsSchema: logSchema,
  allowedChildren: "none",
  onExecutionGraphConstruction(buildContext) {
    return {
      id: buildContext.attributes.id,
      type: "action",
      subType: "log",
      attributes: {
        ...buildContext.attributes, // { expr, label, etc. }
      },
    };
  },
  async execute(
    ctx: StepContext<z.infer<typeof logSchema>>
  ): Promise<StepValue> {
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
