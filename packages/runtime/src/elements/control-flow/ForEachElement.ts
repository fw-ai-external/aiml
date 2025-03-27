import { forEachConfig } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

export const ForEach = createElementDefinition({
  ...forEachConfig,
  tag: "foreach",
  role: "action",
  elementType: "foreach",
  allowedChildren: "any",
  onExecutionGraphConstruction: (buildContext) => {
    return {
      id: buildContext.attributes.id,
      key: buildContext.elementKey,
      type: "action",
      tag: "foreach",
      scope: buildContext.scope,
      attributes: buildContext.attributes,
      next: [],
    };
  },
});
