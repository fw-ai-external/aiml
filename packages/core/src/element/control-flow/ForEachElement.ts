import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";
import type { BaseElement } from "../../runtime/BaseElement";

const forEachSchema = z.object({
  id: z.string().optional(),
  array: z.string(),
  item: z.string(),
  index: z.string().optional(),
});

type ForEachProps = z.infer<typeof forEachSchema>;

export const ForEach = createElementDefinition({
  tag: "foreach",
  propsSchema: forEachSchema,
  allowedChildren: "any",

  async execute(
    ctx: StepContext<ForEachProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue> {
    const { array, item, index } = ctx.attributes;

    try {
      // Create a function that evaluates the array expression in the context of the datamodel
      const fn = new Function(...Object.keys(ctx.datamodel), `return ${array}`);
      const arrayValue = fn(...Object.values(ctx.datamodel));

      if (!Array.isArray(arrayValue)) {
        throw new Error("ForEach array expression must evaluate to an array");
      }

      // Store original value of item variable if it exists
      const originalItemValue = ctx.datamodel[item];
      const originalIndexValue = index ? ctx.datamodel[index] : undefined;

      // Iterate over array
      for (let i = 0; i < arrayValue.length; i++) {
        // Set item and index variables in datamodel
        ctx.datamodel[item] = arrayValue[i];
        if (index) {
          ctx.datamodel[index] = i;
        }

        // Execute child actions
        for (const child of childrenNodes) {
          await (child as BaseElement).execute(ctx as any);
        }
      }

      // Restore original values
      if (originalItemValue !== undefined) {
        ctx.datamodel[item] = originalItemValue;
      } else {
        delete ctx.datamodel[item];
      }

      if (index) {
        if (originalIndexValue !== undefined) {
          ctx.datamodel[index] = originalIndexValue;
        } else {
          delete ctx.datamodel[index];
        }
      }

      return new StepValue({
        type: "object",
        object: { iterations: arrayValue.length },
        raw: JSON.stringify({ iterations: arrayValue.length }),
      });
    } catch (error) {
      console.error("Error in foreach element:", error);
      throw error;
    }
  },
});
