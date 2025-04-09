import { parallelConfig } from "@fireworks/shared";
import { BaseElement } from "../BaseElement";
import { createElementDefinition } from "../createElementFactory";

export const Parallel = createElementDefinition({
  ...parallelConfig,
  onExecutionGraphConstruction(buildContext) {
    buildContext.graphBuilder.thenParallel();

    for (const child of buildContext.children) {
      if (!(child instanceof BaseElement)) {
        console.log("child is not a BaseElement", child);
        // TODO: handle as value in parser
        continue;
      }

      if (child.type === "state") {
        child.onExecutionGraphConstruction(
          buildContext.createNewContextForChild(child)
        );
      }
    }

    for (const child of buildContext.children) {
      if (child.subType === "transition") {
        child.onExecutionGraphConstruction(
          buildContext.createNewContextForChild(child)
        );
      }
    }
  },
});
