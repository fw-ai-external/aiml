import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { BaseElement } from "../../runtime/BaseElement";
import type { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { StepValue } from "../../runtime/StepValue";

const dataSchema = z.object({
  id: z.string().optional(),
  src: z.string().optional(),
  expr: z.string().optional(),
  content: z.string().optional(),
});

type DataProps = z.infer<typeof dataSchema>;

export const Data = createElementDefinition({
  tag: "data",
  propsSchema: dataSchema,
  role: "state",
  elementType: "data",
  allowedChildren: "none",
  async execute(
    ctx: ElementExecutionContext<DataProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue> {
    const { id, src, expr, content } = ctx.attributes;

    if (!id) {
      throw new Error("Data element requires an 'id' attribute");
    }

    try {
      let value;
      if (src) {
        // Load data from external source
        const response = await fetch(src);
        value = await response.json();
      } else if (expr) {
        // Evaluate expression and assign result
        // Note: We're using Function constructor to evaluate expressions in the datamodel context
        value = new Function(
          "datamodel",
          `with(datamodel) { return ${expr}; }`
        )(ctx.datamodel);
      } else {
        // If no src or expr, use the text content as a JSON string
        const textContent = content?.trim() || "";
        value = textContent ? JSON.parse(textContent) : null;
      }

      ctx.datamodel[id] = value;

      return new StepValue({
        type: "object",
        object: { id, value },
        raw: JSON.stringify({ id, value }),
      });
    } catch (error) {
      return new StepValue({
        type: "error",
        code: "DATA_ERROR",
        error: `Failed to process data element: ${error}`,
      });
    }
  },
});
