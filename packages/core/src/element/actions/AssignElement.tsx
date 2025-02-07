import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { StepValue } from "../../runtime/StepValue";
import { BuildContext } from "../../runtime/BuildContext";
import { ExecutionGraphElement } from "../../runtime/types";

const assignSchema = z.object({
  id: z.string().optional(),
  location: z.string(),
  expr: z.string().optional(),
});

export const Assign = createElementDefinition({
  tag: "assign",
  propsSchema: assignSchema,
  allowedChildren: "none",
  onExecutionGraphConstruction(
    buildContext: BuildContext
  ): ExecutionGraphElement {
    return {
      id: buildContext.attributes.id,
      type: "action",
      subType: "assign",
      attributes: {
        ...buildContext.attributes, // location, expr, etc.
      },
    };
  },
  async execute(
    ctx: ElementExecutionContext<z.infer<typeof assignSchema>>
  ): Promise<StepValue> {
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
