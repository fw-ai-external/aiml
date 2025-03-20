import { z } from "zod";
import { BaseElement } from "@fireworks/shared";
import { ExecutionGraphElement } from "@fireworks/types";
import { v4 as uuidv4 } from "uuid";
import { createElementDefinition } from "@fireworks/shared";

const transitionSchema = z.object({
  id: z.string().optional(),
  event: z.string().optional(),
  cond: z.string().optional(),
  target: z.string().optional(),
});

type TransitionProps = z.infer<typeof transitionSchema>;

// Override the initFromAttributesAndNodes method to return a TransitionElement instance
export const Transition = createElementDefinition({
  tag: "transition",
  propsSchema: transitionSchema,
  allowedChildren: "none" as const,
  role: "action",
  elementType: "transition",
  onExecutionGraphConstruction(buildContext): ExecutionGraphElement {
    // 1. If we already built this node, return the cached version.
    const existing = buildContext.getCachedGraphElement(
      buildContext.elementKey
    );
    if (existing) {
      return existing;
    }

    // 2. Combine event + cond => when
    const { event, cond, target } = buildContext.attributes;
    let mergedWhen: string | undefined;
    if (event && cond) {
      mergedWhen = `event=='${event}' && (${cond})`;
    } else if (event) {
      mergedWhen = `event=='${event}'`;
    } else if (cond) {
      mergedWhen = `(${cond})`;
    }

    // 3. Build child actions (like <assign>, <log> inside <transition>)
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

    // 4. Create the transition node
    const id =
      buildContext.attributes.id ||
      (event ? `transition_${event}` : `transition_${uuidv4()}`);
    const key = buildContext.elementKey;
    const transitionNode: ExecutionGraphElement = {
      id,
      key,
      type: "action",
      subType: "transition",
      when: mergedWhen,
      attributes: {
        ...buildContext.attributes,
      },
      next: actionChildren.length > 0 ? actionChildren : undefined,
    };

    // 5. If 'target' is defined, link the target's ExecutionGraphElement
    if (target) {
      const maybeTargetElement: BaseElement | undefined =
        buildContext.findElementByKey(target, buildContext.workflow);

      // Log the result of the search
      console.log(
        `Search result for '${target}': ${maybeTargetElement ? "Found" : "Not found"}`
      );

      if (!maybeTargetElement) {
        throw new Error(
          `Transition ${id} has target ${target} which is not found in the workflow`
        );
      }

      const targetElement = maybeTargetElement;
      if (!targetElement.onExecutionGraphConstruction) {
        throw new Error(
          `Transition ${id} has target ${target} which does not support execution graph construction`
        );
      }

      const targetEG = targetElement.onExecutionGraphConstruction(
        buildContext.createNewContextForChild(targetElement)
      );

      if (!targetEG) {
        throw new Error(
          `Transition ${id} has target ${target} which is not found`
        );
      }
      transitionNode.next = [...(transitionNode.next || []), targetEG];
    }

    // store it in the cache
    buildContext.setCachedGraphElement(
      [key, buildContext.attributes.id].filter(Boolean),
      transitionNode
    );

    // return the newly built transition node
    return transitionNode;
  },
});
