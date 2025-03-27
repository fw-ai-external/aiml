import type { BaseElement } from "./elements/BaseElement";
import { BuildContext } from "./graphBuilder/Context";
import type { ExecutionGraphElement } from "@fireworks/shared";

export const defaultActionExecutionGraphMapper = (
  buildContext: BuildContext
): ExecutionGraphElement => {
  return {
    id: buildContext.attributes.id,
    type: "action",
    key: buildContext.elementKey,
    tag: buildContext.spec.elementType,
    scope: buildContext.scope,
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
    tag: "final",
    scope: buildContext.scope,
    attributes: {
      ...buildContext.attributes,
    },
    next: childEGs,
  };
};
