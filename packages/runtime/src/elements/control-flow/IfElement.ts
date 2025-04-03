import { v4 as uuidv4 } from "uuid";
import type { ExecutionGraphElement } from "@fireworks/shared";
import type { BaseElement } from "../BaseElement";
import { createElementDefinition } from "../createElementFactory";
import { ifConfig } from "@fireworks/shared";

export const If = createElementDefinition({
  ...ifConfig,
  onExecutionGraphConstruction(buildContext): ExecutionGraphElement {
    // Create parent node for the <if>
    const ifNode: ExecutionGraphElement = {
      id: buildContext.attributes.id || `if_${uuidv4()}`,
      key: buildContext.elementKey,
      type: "action",
      tag: "if",
      scope: buildContext.scope,
      attributes: {
        ...buildContext.attributes, // store 'cond' etc.
      },
      next: buildContext.children.map((child) => {
        return child.onExecutionGraphConstruction(
          buildContext.createNewContextForChild(child)
        );
      }),
    };

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
    tag: "if",
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
