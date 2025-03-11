import { z } from "zod";
import { createElementDefinition } from "@fireworks/shared";
import { ExecutionGraphElement } from "@fireworks/types";
import { BaseElement } from "@fireworks/shared";
import { stateConfig } from "@fireworks/element-config";
import { v4 as uuidv4 } from "uuid";
const stateSchema = z.object({
  id: z.string(),
  initial: z.string().optional(),
});

type StateProps = z.infer<typeof stateSchema>;

export const State = createElementDefinition({
  ...stateConfig,
  role: "state",
  elementType: "state",
  onExecutionGraphConstruction(buildContext) {
    const existing = buildContext.getCachedGraphElement(
      buildContext.elementKey
    );
    if (existing) {
      return existing;
    }

    const id = buildContext.attributes.id || `state_${uuidv4()}`;
    const key = buildContext.elementKey;

    // 1. Create a "main" node for this state
    const mainStateNode: ExecutionGraphElement = {
      id,
      key: buildContext.elementKey,
      type: "state",
      subType: "state",
      attributes: {
        ...buildContext.attributes,
        // e.g. storing SCXML 'initial', 'id', etc.
      },
      // children will be sub-state or final nodes
      // or 'onentry' expansions
      next: [],
    };

    // store it in the cache
    buildContext.setCachedGraphElement(
      [key, buildContext.attributes.id].filter(Boolean),
      mainStateNode
    );

    // 2. Build sub-states, transitions, etc.
    //    but we have to treat transitions differently than sub-states
    for (const child of buildContext.children) {
      if (!(child instanceof BaseElement)) {
        console.log("child is not a BaseElement", child);
        // TODO: handle as value in parser
        continue;
      }
      if (child.elementType === "transition") {
        // We'll build the transition action
        const txEG = child.onExecutionGraphConstruction?.(
          buildContext.createNewContextForChild(child)
        );
        if (!txEG) {
          // TODO: handle as value in parser
          continue;
        }
        // Make the transition depend on this state's node finishing "onentry"
        if (!txEG.runAfter) {
          txEG.runAfter = [];
        }
        txEG.runAfter.push(mainStateNode.id);

        // So the transition belongs in the same "level" as the state.
        // We might attach it as a separate sibling or a child.
        // Example: We'll add it as a child. The runtime can interpret it as a sub-action
        mainStateNode.next!.push(txEG);
      } else if (
        child.elementType === "state" ||
        child.elementType === "final" ||
        child.elementType === "parallel"
      ) {
        // Another sub-state => build it
        const subEG = child.onExecutionGraphConstruction?.(
          buildContext.createNewContextForChild(child)
        );
        if (!subEG) {
          // TODO: handle as value in parser
          continue;
        }

        // This sub-state should not start unless a transition leads into it
        // In SCXML, if 'initial' references this sub-state, we might define subEG.dependsOn = [this.id + "_main"]
        // or if there's a <transition> with target=child.id, we add that ID to subEG.dependsOn
        if (!subEG.runAfter) {
          subEG.runAfter = [];
        }

        // If the 'initial' attribute = child.id, then subEG depends on S1_main
        if (buildContext.attributes.initial === child.id) {
          subEG.runAfter.push(mainStateNode.id);
        }

        // We'll push this sub-state as a child, or as a sibling.
        mainStateNode.next!.push(subEG);
      } else if (child.elementType === "onexit") {
        // TODO: onexit elements should run after any transition that leaves this state aka not going to a sub-state

        // or other sub constructs
        // you might store them differently
        const onexitEG = child.onExecutionGraphConstruction(
          buildContext.createNewContextForChild(child)
        );
        if (!onexitEG) {
          // TODO: handle as value in parser
          continue;
        }
        // attach as child
        mainStateNode.next!.push(onexitEG);
      } else {
        const actionEG = child.onExecutionGraphConstruction(
          buildContext.createNewContextForChild(child)
        );
        if (actionEG) {
          // We'll attach it as a child or we could flatten
          mainStateNode.next!.push(actionEG);
        } else {
          throw new Error(
            `Error during onExecutionGraphConstruction for element of type ${child.elementType} with id ${child.id}. No graph config returned`
          );
        }
      }
    }

    return mainStateNode;
  },
});
