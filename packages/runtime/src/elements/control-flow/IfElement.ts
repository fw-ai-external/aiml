import { ifConfig } from "@aiml/shared";
import { createElementDefinition } from "../createElementFactory";

export const If = createElementDefinition({
  ...ifConfig,
  onExecutionGraphConstruction(buildContext) {
    buildContext.graphBuilder.if(buildContext.attributes.condition);
    buildContext.children.forEach((child) => {
      child.onExecutionGraphConstruction(
        buildContext.createNewContextForChild(child)
      );
    });
    buildContext.graphBuilder.endIf();
  },
});
