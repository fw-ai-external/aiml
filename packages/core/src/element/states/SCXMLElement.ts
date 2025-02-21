import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import { BaseElement } from "../../runtime/BaseElement";
import { ExecutionGraphElement } from "../../runtime/types";

const scxmlSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  initial: z.string().optional(),
  datamodel: z
    .enum(["null", "minimal", "ecmascript"])
    .default("ecmascript")
    .optional(),
});

type SCXMLProps = z.infer<typeof scxmlSchema>;

export const SCXML = createElementDefinition({
  tag: "scxml",
  propsSchema: scxmlSchema,
  role: "user-input",
  elementType: "state",
  allowedChildren: ["state", "parallel", "final", "datamodel", "script"],
  onExecutionGraphConstruction(buildContext) {
    // Convert all child elements into ExecutionGraphElements
    const childElements = buildContext.children
      .map((child) => {
        if (child instanceof BaseElement) {
          return child.onExecutionGraphConstruction?.(
            buildContext.createNewContextForChild(child)
          );
        }
      })
      .filter(Boolean) as ExecutionGraphElement[];

    return {
      id: "Incoming Request",
      type: "user-input", // SCXML is a container => state
      subType: "scxml", // let subType reflect it's SCXML root
      key: buildContext.elementKey,
      attributes: {
        ...buildContext.attributes,
        // any top-level SCXML data e.g. version, initial, binding, etc.
      },
      next: childElements,
    };
  },
});
