import { createElementDefinition } from "../createElementFactory";
import { StepValue } from "../../StepValue";
import { forEachConfig } from "@fireworks/shared";

export const ForEach = createElementDefinition({
  ...forEachConfig,
  tag: "foreach",
  role: "action",
  elementType: "foreach",
  allowedChildren: "any",
  execute: async function (context, childrenNodes) {
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

      return {
        result: new StepValue({
          object: { iterations: arrayValue.length },
        }),
      };
    } catch (error) {
      console.error("Error in foreach element:", error);
      throw error;
    }
  },
});
