import { stateConfig } from "@aiml/shared";
import { BaseElement } from "../BaseElement";
import { createElementDefinition } from "../createElementFactory";

export const State = createElementDefinition({
  ...stateConfig,
  onExecutionGraphConstruction(buildContext) {
    buildContext.graphBuilder.then();

    // 1. Process all children actions
    for (const child of buildContext.children) {
      if (!(child instanceof BaseElement)) {
        // TODO: handle as value in parser
        continue;
      }

      if (child.type === "action" && child.subType !== "transition") {
        child.onExecutionGraphConstruction(
          buildContext.createNewContextForChild(child)
        );
      }
    }

    // 2. if we have an initial state, process it after actions but before transitions
    if (buildContext.attributes.initial) {
      // Then process the initial state if it exists
      for (const child of buildContext.children) {
        if (
          child instanceof BaseElement &&
          child.type === "state" &&
          buildContext.attributes.initial === child.id
        ) {
          // Process initial state after actions but before transitions
          child.onExecutionGraphConstruction?.(
            buildContext.createNewContextForChild(child)
          );
        }
      }
    }

    // 3. Finally process all transitions
    // 3a First process transitions with conditions
    for (const child of buildContext.children) {
      if (
        child instanceof BaseElement &&
        child.subType === "transition" &&
        child.attributes.cond
      ) {
        child.onExecutionGraphConstruction?.(
          buildContext.createNewContextForChild(child)
        );
      }
    }

    // 3b Then process transitions without conditions
    for (const child of buildContext.children) {
      if (
        child instanceof BaseElement &&
        child.subType === "transition" &&
        !child.attributes.cond
      ) {
        child.onExecutionGraphConstruction?.(
          buildContext.createNewContextForChild(child)
        );
      }
    }
  },
});
