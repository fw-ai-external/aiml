import { v4 as uuidv4 } from "uuid";
import { transitionConfig } from "@aiml/shared";
import { BaseElement } from "../BaseElement";
import { createElementDefinition } from "../createElementFactory";

// Override the initFromAttributesAndNodes method to return a TransitionElement instance
export const Transition = createElementDefinition({
  ...transitionConfig,
  onExecutionGraphConstruction(buildContext) {
    buildContext.graphBuilder.then({
      when: buildContext.attributes.condition,
    });
    // Build child actions (like <assign>, <log> inside <transition>)
    for (const child of buildContext.children) {
      if (!(child instanceof BaseElement)) {
        console.log("child is not a BaseElement", child);
        // TODO: handle as value in parser
        continue;
      }
      // each child is presumably an <assign>, <log>, etc.
      child.onExecutionGraphConstruction?.(
        buildContext.createNewContextForChild(child)
      );
    }

    // Create the transition node
    const id = buildContext.attributes.id || `transition_${uuidv4()}`;
    const key = buildContext.elementKey;

    // If 'target' is defined, link the target's ExecutionGraphStep
    const maybeTargetElement: BaseElement | undefined =
      buildContext.findElementByKey(buildContext.attributes.target);

    if (!maybeTargetElement) {
      throw new Error(
        `Transition ${id} has target ${buildContext.attributes.target} which is not found in the workflow`
      );
    }

    const targetElement = maybeTargetElement;
    if (!targetElement.onExecutionGraphConstruction) {
      throw new Error(
        `Transition ${id} has target ${buildContext.attributes.target} which does not support execution graph construction`
      );
    }

    targetElement.onExecutionGraphConstruction(
      buildContext.createNewContextForChild(targetElement)
    );
  },
});
