import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { BaseElement } from "../../runtime/BaseElement";
import { BuildContext } from "../../runtime/BuildContext";
import { ExecutionGraphElement } from "../../runtime/types";
import { v4 as uuidv4 } from "uuid";
const ifSchema = z.object({
  id: z.string().optional(),
  cond: z.string(),
});

type IfProps = z.infer<typeof ifSchema>;

export const If = createElementDefinition({
  tag: "if",
  propsSchema: ifSchema,
  allowedChildren: ["elseif", "else"],
  onExecutionGraphConstruction(
    buildContext: BuildContext
  ): ExecutionGraphElement {
    // If we have a cache system:
    const cached = buildContext.getCachedGraphElement(
      buildContext.attributes.id
    );
    if (cached) return cached;

    // Create parent node for the <if>
    const ifNode: ExecutionGraphElement = {
      id: buildContext.attributes.id || `if_${uuidv4()}`,
      type: "step",
      subType: "if",
      attributes: {
        ...buildContext.attributes, // store 'cond' etc.
      },
      next: [],
    };

    buildContext.setCachedGraphElement(ifNode.id, ifNode);

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
      if ("tag" in e && (e.tag === "elseif" || e.tag === "else")) {
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

        // Collect child actions from the elseIf
        // This might be the direct children of ElseIfElement
        const elseIfChildren = ch.children.map((gc) => gc as BaseElement);

        const partitionNode = buildIfPartitionNode(
          `${ifNode.id}_p${partitionIndex}`,
          mergedCond,
          elseIfChildren,
          buildContext
        );

        ifNode.next!.push(partitionNode);

        // Add c2 to priorConds
        priorConds.push(c2);
        partitionIndex++;
      } else if (ch.elementType === "else") {
        // This is the final partition if we get here
        const elseChildren = ch.children.map((gc) => gc as BaseElement);

        // mergedCond => the negation of all priorConds
        // i.e. !c1 && !c2 && ...
        const mergedCond = buildShortCircuitCondition("true", priorConds);

        const partitionNode = buildIfPartitionNode(
          `${ifNode.id}_p${partitionIndex}`,
          mergedCond,
          elseChildren,
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
          lastPartition.next!.push(cEG);
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
  buildContext: BuildContext
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
    type: "step",
    subType: "if-part",
    when: condition,
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
