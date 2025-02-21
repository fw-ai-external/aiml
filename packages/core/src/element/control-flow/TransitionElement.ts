import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import { BaseElement } from "../../runtime/BaseElement";
import { ExecutionGraphElement } from "../../runtime/types";
import { StepValue } from "../../runtime/StepValue";
import { v4 as uuidv4 } from "uuid";

const transitionSchema = z.object({
  id: z.string().optional(),
  event: z.string().optional(),
  cond: z.string().optional(),
  target: z.string().optional(),
});

type TransitionProps = z.infer<typeof transitionSchema>;

export const Transition = createElementDefinition({
  tag: "transition",
  propsSchema: transitionSchema,
  allowedChildren: "none" as const,
  role: "action",
  elementType: "transition",
  async execute(ctx) {
    const { event, cond, target } = ctx.attributes;
    // For now, just check if condition exists since we don't have evaluateCondition
    const conditionMet = !cond;

    return new StepValue({
      type: "object",
      object: { event, target, conditionMet },
      raw: JSON.stringify({ event, target, conditionMet }),
    });
  },
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

    // store it in the cache
    buildContext.setCachedGraphElement(
      [key, buildContext.attributes.id].filter(Boolean),
      transitionNode
    );

    // 5. If 'target' is defined, link the target's ExecutionGraphElement
    if (target) {
      const maybeTargetElement = buildContext.getElementByKey(target);
      if (!maybeTargetElement) {
        throw new Error(
          `Transition ${id} has target ${target} which is not found in the workflow`
        );
      }

      const targetElement = maybeTargetElement as BaseElement;
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

      targetEG.runAfter = targetEG.runAfter || [];

      // push this transition's ID into the target's dependsOn
      if (!targetEG.runAfter.includes(id)) {
        targetEG.runAfter.push(id);
      } else {
        console.warn(`Transition ${id} already depends on ${targetEG.id}`);
      }
    }

    // return the newly built transition node
    return transitionNode;
  },
});
