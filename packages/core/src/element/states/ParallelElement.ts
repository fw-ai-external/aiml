import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import { ExecutionGraphElement } from "../../runtime/types";
import { BaseElement } from "../";

const parallelSchema = z.object({
  id: z.string(),
});

type ParallelProps = z.infer<typeof parallelSchema>;

export const Parallel = createElementDefinition({
  tag: "parallel",
  propsSchema: parallelSchema,
  role: "state",
  elementType: "parallel",
  allowedChildren: [
    "onentry",
    "onexit",
    "transition",
    "state",
    "parallel",
    "history",
    "datamodel",
  ],
  onExecutionGraphConstruction(buildContext) {
    // 1. Check cache to avoid building multiple times
    const cached = buildContext.getCachedGraphElement(
      buildContext.attributes.id
    );
    if (cached) {
      return cached;
    }

    // 2. Create main parallel node
    const parallelNode: ExecutionGraphElement = {
      id: buildContext.attributes.id + "_main",
      type: "state",
      key: buildContext.elementKey,
      subType: "parallel",
      attributes: {
        ...buildContext.attributes,
      },
      next: [],
    };

    // store in cache
    buildContext.setCachedGraphElement(
      [buildContext.attributes.id, parallelNode.key].filter(Boolean),
      parallelNode
    );

    // We'll keep track of all finalIDs from each child
    const finalNodeKeys: string[] = [];

    // 3. For each child, build the graph
    //    The child might be <state>, <parallel>, etc.
    //    We'll gather their final node IDs along the way
    for (const child of buildContext.children) {
      // build child
      const childEG =
        "tag" in child
          ? (child as BaseElement).onExecutionGraphConstruction?.(buildContext)
          : null;
      if (!childEG) continue;

      // we attach childEG to parallelNode.children
      // so they run in parallel
      parallelNode.next!.push(childEG);

      // find final nodes in that child's sub-graph
      // we might do a helper function "collectFinalNodes"
      const childFinals = collectFinalNodes(childEG);
      finalNodeKeys.push(...childFinals);
    }

    // 4. Create "parallelDone" node that depends on all child final node IDs
    if (finalNodeKeys.length > 0) {
      const parallelDone: ExecutionGraphElement = {
        id: buildContext.attributes.id + "_done",
        type: "state",
        key: buildContext.elementKey,
        subType: "parallelDone",
        attributes: {
          // store SCXML data if needed
          parentParallel: buildContext.attributes.id,
        },
        runAfter: [...finalNodeKeys],
      };
      // attach as a child (or sibling) so it's part of the same structure
      parallelNode.next!.push(parallelDone);
    }

    // 5. Return the main parallel node
    return parallelNode;
  },
});

/**
 * Recursively traverse an ExecutionGraphElement sub-tree,
 * collecting IDs of final nodes (subType="final").
 * (Or we can do subType="state" with some final property,
 * depends on how you're building final states).
 */
function collectFinalNodes(node: ExecutionGraphElement): string[] {
  const result: string[] = [];
  if (node.subType === "final") {
    result.push(node.key);
  }
  if (node.next) {
    for (const c of node.next) {
      result.push(...collectFinalNodes(c));
    }
  }
  return result;
}
