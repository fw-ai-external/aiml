import { elseIfConfig } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

export const ElseIf = createElementDefinition({
  ...elseIfConfig,
  onExecutionGraphConstruction(buildContext) {
    buildContext.graphBuilder.elseIf(buildContext.attributes.condition);
  },
});
