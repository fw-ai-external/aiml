import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { StepValue } from "../../runtime/StepValue";
import type { BaseElement } from "../../runtime/BaseElement";

const dataModelSchema = z.object({
  id: z.string().optional(),
});

type DataModelProps = z.infer<typeof dataModelSchema>;

export const DataModel = createElementDefinition({
  tag: "datamodel",
  propsSchema: dataModelSchema,
  allowedChildren: ["data"],

  async execute(
    ctx: ElementExecutionContext<DataModelProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue> {
    try {
      // Initialize data elements
      const dataElements = childrenNodes.filter(
        (child) => child.elementType === "data"
      );

      for (const data of dataElements) {
        await initializeDataElement(data, ctx);
      }

      return new StepValue({
        type: "object",
        object: { initialized: true },
        raw: JSON.stringify({ initialized: true }),
      });
    } catch (error) {
      console.error("Error in datamodel element:", error);
      throw error;
    }
  },
});

async function initializeDataElement(
  element: BaseElement,
  ctx: ElementExecutionContext<DataModelProps>
): Promise<void> {
  const id = element.id;
  const expr = element.attributes["expr"];
  const src = element.attributes["src"];

  if (expr) {
    try {
      // Create a function that evaluates expressions in the context of the datamodel
      const fn = new Function(...Object.keys(ctx.datamodel), `return ${expr}`);
      const value = fn(...Object.values(ctx.datamodel));
      ctx.datamodel[id] = value;
    } catch (error) {
      console.error(
        `Error evaluating expression for data element ${id}:`,
        error
      );
    }
  } else if (src) {
    try {
      const response = await fetch(src);
      const value = await response.json();
      ctx.datamodel[id] = value;
    } catch (error) {
      console.error(
        `Error fetching data from src for data element ${id}:`,
        error
      );
    }
  }
}
