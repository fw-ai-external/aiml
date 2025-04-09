import { foreachConfig } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

export const ForEach = createElementDefinition({
  ...foreachConfig,
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
