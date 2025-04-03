import { v4 as uuidv4 } from "uuid";
import {
  transitionConfig,
  type ExecutionGraphElement,
} from "@fireworks/shared";
import type { BaseElement } from "../BaseElement";
import { createElementDefinition } from "../createElementFactory";

// Override the initFromAttributesAndNodes method to return a TransitionElement instance
export const Transition = createElementDefinition({
  ...transitionConfig,
  allowedChildren: "none" as const,
  role: "action",
  elementType: "transition",
  onExecutionGraphConstruction(buildContext): ExecutionGraphElement {
    // Build child actions (like <assign>, <log> inside <transition>)
    const actionChildren: ExecutionGraphElement[] = [];
    for (const ch of buildContext.children) {
      // each child is presumably an <assign>, <log>, etc.
      if ("tag" in ch) {
        const childEG = (ch as BaseElement).onExecutionGraphConstruction?.(
          buildContext.createNewContextForChild(ch)
        );
        if (childEG) {
          actionChildren.push(childEG);
        }
      }
    }

    // Create the transition node
    const id = buildContext.attributes.id || `transition_${uuidv4()}`;
    const key = buildContext.elementKey;
    const transitionNode: ExecutionGraphElement = {
      id,
      key,
      type: "action",
      tag: "transition",
      scope: buildContext.scope,
      when: buildContext.attributes.cond,
      attributes: {
        ...buildContext.attributes,
      },
      next: actionChildren.length > 0 ? actionChildren : undefined,
    };

    // If 'target' is defined, link the target's ExecutionGraphElement
    if (buildContext.attributes.target) {
      const maybeTargetElement: BaseElement | undefined =
        buildContext.findElementByKey(
          buildContext.attributes.target,
          buildContext.fullSpec ?? buildContext.spec
        );

      if (!maybeTargetElement) {
        throw new Error(
          `==== Transition ${id} has target ${buildContext.attributes.target} which is not found in the workflow`
        );
      }

      const targetElement = maybeTargetElement;
      if (!targetElement.onExecutionGraphConstruction) {
        throw new Error(
          `==== Transition ${id} has target ${buildContext.attributes.target} which does not support execution graph construction`
        );
      }

      const targetEG = targetElement.onExecutionGraphConstruction(
        buildContext.createNewContextForChild(targetElement)
      );

      if (!targetEG) {
        throw new Error(
          `==== Transition ${id} has target ${buildContext.attributes.target} which is not found`
        );
      }
      transitionNode.next = [...(transitionNode.next || []), targetEG];
    }

    // return the newly built transition node
    return transitionNode;
  },
});
