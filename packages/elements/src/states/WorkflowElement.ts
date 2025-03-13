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

    // Find the final element among children
    const finalElement = childElements.find(
      (element) => element.subType === "final"
    );

    // If no final element was found, this shouldn't happen as the parser should add one
    // But we'll handle it gracefully and log a warning
    if (!finalElement) {
      console.warn(
        "No final element found in workflow. Parser should have added one."
      );
    }

    // Ensure all child elements that don't already have a transition end with a transition to final
    for (const childElement of childElements) {
      // Skip the final element itself
      if (childElement.subType === "final") continue;

      // If the element has no next elements defined (leaf node), make it transition to final
      if (!childElement.next || childElement.next.length === 0) {
        if (finalElement) {
          childElement.next = [finalElement];
        }
      }
    }

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
