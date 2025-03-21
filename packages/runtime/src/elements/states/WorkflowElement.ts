import { z } from "zod";
import { createElementDefinition } from "../createElementFactory";
import { BaseElement } from "../BaseElement";
import { ExecutionGraphElement } from "../../types";
import { workflowConfig } from "@fireworks/shared";

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
        return null;
      })
      .filter(Boolean) as ExecutionGraphElement[];

    let initialStep: ExecutionGraphElement | undefined;
    // look for initial state if attribute is present
    const initial = buildContext.attributes.initial
      ? childElements.find(
          (child) => child.id === buildContext.attributes.initial
        )
      : undefined;

    if (initial) {
      initialStep = initial;
    } else {
      // use first child of role state as initial step
      initialStep = childElements.find(
        (child) => child.type === "state" && child.subType !== "final"
      );
    }

    // now cache the initial step as "initial" keyword too
    buildContext.setCachedGraphElement(
      ["initial", buildContext.elementKey].filter(Boolean),
      initialStep!
    );

    return {
      id: "Incoming Request",
      type: "user-input",
      subType: "workflow", // let subType reflect it's the root
      key: buildContext.elementKey,
      attributes: buildContext.attributes,
      next: [initialStep!],
    };
  },
});
