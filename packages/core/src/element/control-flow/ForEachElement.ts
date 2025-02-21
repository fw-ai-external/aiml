import { createElementDefinition } from "../createElementDefinition";
import type { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { StepValue } from "../../runtime/StepValue";
import type { BaseElement } from "../../runtime/BaseElement";
import type { RunstepOutput } from "../../types";
import { z } from "zod";

const forEachSchema = z.object({
  id: z.string().optional(),
  array: z.string(),
  item: z.string(),
  index: z.string().optional(),
});

type ForEachAttributes = z.infer<typeof forEachSchema>;

export const ForEach = createElementDefinition<ForEachAttributes>({
  tag: "foreach",
  propsSchema: forEachSchema,
  role: "action",
  elementType: "foreach",
  allowedChildren: "any",
  execute: async function (
    context: ElementExecutionContext<ForEachAttributes, RunstepOutput>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue> {
    const { array, item, index } = context.attributes;
    let arrayValue: unknown[];
    let originalItemValue: unknown;
    let originalIndexValue: unknown;

    try {
      // Create a function that evaluates the array expression in the context of the datamodel
      const fn = new Function(
        ...Object.keys(context.datamodel),
        `return ${array}`
      );
      arrayValue = fn(...Object.values(context.datamodel));

      if (!Array.isArray(arrayValue)) {
        throw new Error("ForEach array expression must evaluate to an array");
      }

      // Store original value of item variable if it exists
      originalItemValue = context.datamodel[item];
      originalIndexValue = index ? context.datamodel[index] : undefined;

      // Iterate over array
      for (let i = 0; i < arrayValue.length; i++) {
        // Set item and index variables in datamodel
        context.datamodel[item] = arrayValue[i];
        if (index) {
          context.datamodel[index] = i;
        }

        // Execute child actions
        for (const child of childrenNodes) {
          await child.execute(context);
        }
      }

      // Restore original values
      if (originalItemValue !== undefined) {
        context.datamodel[item] = originalItemValue;
      } else {
        delete context.datamodel[item];
      }

      if (index) {
        if (originalIndexValue !== undefined) {
          context.datamodel[index] = originalIndexValue;
        } else {
          delete context.datamodel[index];
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
