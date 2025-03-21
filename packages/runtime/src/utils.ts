import { BaseElement } from "./elements/BaseElement";
import { BuildContext } from "./graphBuilder/Context";
import { ExecutionGraphElement } from "./types";

export const defaultActionExecutionGraphMapper = (
  buildContext: BuildContext
): ExecutionGraphElement => {
  return {
    id: buildContext.attributes.id,
    type: "action",
    key: buildContext.elementKey,
    subType: buildContext.spec.elementType,
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
            child.id,
            buildContext.children,
            buildContext.attributes,
            buildContext.conditions,
            buildContext.spec,
            buildContext.fullSpec,
            buildContext.graphCache
          ) as any
        );
      }
      return null;
    })
    .filter(Boolean) as ExecutionGraphElement[];

  // We might store any onentry blocks or <donedata> in children
  return {
    id: buildContext.attributes.id,
    key: buildContext.elementKey,
    type: "state", // or "action" if you prefer
    subType: "final",
    attributes: {
      ...buildContext.attributes,
    },
    next: childEGs,
  };
};
