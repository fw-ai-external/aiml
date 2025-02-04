import { BaseElement } from "../element/BaseElement";
import { BuildContext } from "./BuildContext";
import { ExecutionGraphElement } from "./types";

export const defaultActionExecutionGraphMapper = (
  buildContext: BuildContext
): ExecutionGraphElement => {
  return {
    id: buildContext.attributes.id,
    type: "action",
    subType: buildContext.thisElement.elementType,
    attributes: {
      ...buildContext.attributes, // location, expr, etc.
    },
  };
};

export const defaultStepExecutionGraphMapper = (
  buildContext: BuildContext
): ExecutionGraphElement => {
  const childEGs = buildContext.children
    .map((child) => {
      if ("tag" in child) {
        return (child as BaseElement).onExecutionGraphConstruction?.(
          new BuildContext(
            buildContext.workflow,
            buildContext.children,
            buildContext.attributes,
            buildContext.conditions,
            buildContext.spec
          )
        );
      }
      return null;
    })
    .filter(Boolean) as ExecutionGraphElement[];

  // We might store any onentry blocks or <donedata> in children
  return {
    id: buildContext.attributes.id,
    type: "step", // or "action" if you prefer
    subType: "final",
    attributes: {
      ...buildContext.attributes,
    },
    next: childEGs,
  };
};
