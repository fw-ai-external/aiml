import { v4 as uuidv4 } from "uuid";
import type { ExecutionGraphElement } from "@fireworks/shared";
import type { BaseElement } from "../BaseElement";
import { createElementDefinition } from "../createElementFactory";
import { ifConfig } from "@fireworks/shared";

export const If = createElementDefinition({
  ...ifConfig,
  onExecutionGraphConstruction(buildContext): ExecutionGraphElement {
    // If we have a cache system:
    const cached = buildContext.getCachedGraphElement(
      buildContext.attributes.id
    );
    if (cached) return cached;

    // Create parent node for the <if>
    const ifNode: ExecutionGraphElement = {
      id: buildContext.attributes.id || `if_${uuidv4()}`,
      key: buildContext.elementKey,
      type: "state",
      tag: "if",
      scope: buildContext.scope,
      attributes: {
        ...buildContext.attributes, // store 'cond' etc.
      },
      next: [],
    };

    buildContext.setCachedGraphElement(
      [buildContext.attributes.id, ifNode.key].filter(Boolean),
      ifNode
    );

    // 1) The first partition is the content under <if> (not <elseif> or <else>)
    // We gather those child nodes until we reach an <elseif> or <else>.
    // Then we build a single partition node with the <if cond> as is.
    const mainIfCond = buildContext.attributes.cond || "false";

    // find the boundary in the children
    let index = 0;
    const children = buildContext.children;
    const firstPartitionChildren: BaseElement[] = [];
    for (; index < children.length; index++) {
      const e = children[index];
      if (e && "tag" in e && (e.tag === "elseif" || e.tag === "else")) {
        break;
      }
      firstPartitionChildren.push(e as BaseElement);
    }

    // Convert first partition to an if-part node
    const partition1 = buildIfPartitionNode(
      `${ifNode.id}_p1`,
      mainIfCond,
      firstPartitionChildren,
      buildContext
    );

    ifNode.next!.push(partition1);

    // 2) We keep track of all prior conditions for short-circuit
    // The first partition's condition is mainIfCond
    let priorConds: string[] = [mainIfCond];

    // 3) Now parse <elseif> / <else> in doc order
    let partitionIndex = 0;
    for (; index < children.length; index++) {
      const ch: BaseElement = children[index] as BaseElement;

      if ("tag" in ch && ch.tag === "elseif") {
        // We'll build the elseIfEl fully, but we want to embed the
        // short-circuit condition around it
        const c2 = ch.attributes.cond || "false";
        // final condition => c2 && !(mainIfCond) && ...
        const mergedCond = buildShortCircuitCondition(c2, priorConds);

        const partitionNode = buildIfPartitionNode(
          `${ifNode.id}_p${partitionIndex}`,
          mergedCond,
          ch.children,
          buildContext
        );

        ifNode.next!.push(partitionNode);

        // Add c2 to priorConds
        priorConds.push(c2);
        partitionIndex++;
      } else if (ch.elementType === "else") {
        // mergedCond => the negation of all priorConds
        // i.e. !c1 && !c2 && ...
        const mergedCond = buildShortCircuitCondition("true", priorConds);

        const partitionNode = buildIfPartitionNode(
          `${ifNode.id}_p${partitionIndex}`,
          mergedCond,
          ch.children,
          buildContext
        );
        ifNode.next!.push(partitionNode);
        // Once we add <else>, there's no more partitions
        break;
      } else {
        // If we see nodes that are not <else/elseif>, treat them as part of the most recent partition
        // This allows for the common pattern of having content between elseif tags
        const cEG = ch.onExecutionGraphConstruction?.(
          buildContext.createNewContextForChild(ch)
        );
        if (cEG) {
          const lastPartition = ifNode.next![partitionIndex];
          if (lastPartition) {
            lastPartition.next!.push(cEG);
          }
        }
      }
    }

    return ifNode;
  },
});

/**
 * Helper to produce a single "if-part" node
 * that sets "when=condition" and has child actions.
 */
function buildIfPartitionNode(
  partitionId: string,
  condition: string,
  subEls: BaseElement[],
  buildContext: any
): ExecutionGraphElement {
  // Build child actions
  const childEGs: ExecutionGraphElement[] = [];
  for (const el of subEls) {
    const cEG = el.onExecutionGraphConstruction?.(
      buildContext.createNewContextForChild(el)
    );
    if (cEG) {
      childEGs.push(cEG);
    }
  }

  const partitionNode: ExecutionGraphElement = {
    id: partitionId,
    key: buildContext.elementKey,
    type: "state",
    tag: "if-part",
    when: condition,
    scope: buildContext.scope,
    attributes: {
      cond: condition,
    },
    next: childEGs,
  };
  return partitionNode;
}

/**
 * Build " c && !(cond1) && !(cond2) ... "
 * i.e. c AND NOT any previous condition is true
 * so we short-circuit in doc order
 */
function buildShortCircuitCondition(
  thisCond: string,
  priorConds: string[]
): string {
  // if priorConds = [ c1, c2, ... ], we want thisCond && !(c1) && !(c2) ...
  // We'll do: `(${thisCond}) && (!(${c1})) && (!(${c2})) ...`
  const negs = priorConds.map((pc) => `(!(${pc}))`).join(" && ");
  if (!negs) {
    // if no priorConds, just return thisCond
    return thisCond;
  }
  return `(${thisCond}) && ${negs}`;
}
