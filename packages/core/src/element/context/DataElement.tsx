import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { BaseElement } from "../BaseElement";
import type { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";

const dataSchema = z.object({
  id: z.string(),
  src: z.string().optional(),
  expr: z.string().optional(),
  content: z.string().optional(),
});

type DataProps = z.infer<typeof dataSchema>;

export const Data = createElementDefinition({
  tag: "data",
  propsSchema: dataSchema,
  allowedChildren: "none",
  async execute(
    ctx: StepContext<DataProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue | null> {
    const { id, src, expr, content } = ctx.attributes;

    if (!id) {
      throw new Error("Data element requires an 'id' attribute");
    }

    if (src) {
      // Load data from external source
      try {
        const response = await fetch(src);
        const data = await response.json();
        ctx.datamodel[id] = data;
      } catch (error) {
        throw new Error(`Failed to load data from src '${src}': ${error}`);
      }
    } else if (expr) {
      // Evaluate expression and assign result
      // Note: We're using Function constructor to evaluate expressions in the datamodel context
      const value = new Function(
        "datamodel",
        `with(datamodel) { return ${expr}; }`
      )(ctx.datamodel);
      ctx.datamodel[id] = value;
    } else {
      // If no src or expr, use the text content as a JSON string
      try {
        const textContent = content?.trim() || "";
        const value = textContent ? JSON.parse(textContent) : null;
        ctx.datamodel[id] = value;
      } catch (error) {
        throw new Error(`Failed to parse data content as JSON: ${error}`);
      }
    }

    return new StepValue({
      type: "data",
      id,
      data: ctx.datamodel[id],
    });
  },
});
