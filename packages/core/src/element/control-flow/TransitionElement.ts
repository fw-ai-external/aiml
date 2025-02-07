import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import { BaseElement } from "../../runtime/BaseElement";
import { ExecutionGraphElement } from "../../runtime/types";

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
  elementShouldRun: {
    // todo support evaluating conditions from ctx.attributes.cond
    when: (ctx) => Promise.resolve(!ctx.attributes.cond),
  },
  onExecutionGraphConstruction(buildContext) {
    // 1. If we already built this node, return the cached version.
    const existing = buildContext.getCachedGraphElement(
      buildContext.attributes.id
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
      const childEG =
        "tag" in ch
          ? (ch as BaseElement).onExecutionGraphConstruction?.(
              buildContext.createNewContextForChild(ch)
            )
          : null;
      if (childEG) {
        actionChildren.push(childEG);
      }
    }

    // 4. Create the transition node
    const transitionNode: ExecutionGraphElement = {
      id:
        buildContext.attributes.id ||
        (event ? `transition_${event}` : `transition_${Date.now()}`),
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
      buildContext.attributes.id,
      transitionNode
    );

    // 5. If 'target' is defined, link the target's ExecutionGraphElement
    if (target) {
      const targetElement = buildContext.getElementById(target);
      if (targetElement) {
        // get or build the target's ExecutionGraphElement
        const targetEG = targetElement.onExecutionGraphConstruction?.(
          buildContext.createNewContextForChild(targetElement)
        );

        if (!targetEG) {
          throw new Error(
            `Transition ${transitionNode.id} has target ${target} which is not found`
          );
        }

        if (!targetEG.runAfter) {
          targetEG.runAfter = [];
        }
        // push this transition's ID into the target's dependsOn
        if (!targetEG.runAfter.includes(transitionNode.id)) {
          targetEG.runAfter.push(transitionNode.id);
        } else {
          console.warn(
            `Transition ${transitionNode.id} already depends on ${targetEG.id}`
          );
        }
      }
    }

    // return the newly built transition node
    return transitionNode;
  },
});
