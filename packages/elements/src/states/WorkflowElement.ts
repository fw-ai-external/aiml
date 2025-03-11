import { z } from "zod";
import { createElementDefinition, BaseElement } from "@fireworks/shared";
import { ExecutionGraphElement } from "@fireworks/types";
import { workflowConfig } from "@fireworks/element-config";

type WorkflowProps = z.infer<typeof workflowConfig.propsSchema>;

export const Workflow = createElementDefinition({
  ...workflowConfig,
  role: "user-input",
  elementType: "state",
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
      subType: "workflow", // let subType reflect it's SCXML root
      key: buildContext.elementKey,
      attributes: {
        ...buildContext.attributes,
        // any top-level SCXML data e.g. version, initial, binding, etc.
      },
      next: childElements,
    };
  },
});
