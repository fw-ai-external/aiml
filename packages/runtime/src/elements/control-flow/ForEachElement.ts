import { createElementDefinition } from "../createElementFactory";
import { forEachConfig } from "@fireworks/shared";

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
      subType: "foreach",
      attributes: buildContext.attributes,
      next: [],
    };
  },
});
