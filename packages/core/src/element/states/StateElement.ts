import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import { ExecutionGraphElement } from "../../runtime/types";
import { BaseElement } from "../../runtime/BaseElement";

const stateSchema = z.object({
  id: z.string(),
  initial: z.string().optional(),
});

type StateProps = z.infer<typeof stateSchema>;

export const State = createElementDefinition({
  tag: "state",
  propsSchema: stateSchema,
  role: "state",
  allowedChildren: [
    "onentry",
    "onexit",
    "transition",
    "invoke",
    "state",
    "parallel",
    "final",
  ],
  onExecutionGraphConstruction(buildContext) {
    // 1. Create a "main" node for this state
    const mainStateNode: ExecutionGraphElement = {
      id: buildContext.attributes.id + "_main",
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

    // 2. Build onentry as child "actions" (sequence if multiple)
    const onentryEl = buildContext.children.find(
      (ch) => "tag" in ch && ch.tag === "onentry"
    );
    if (onentryEl && "tag" in onentryEl) {
      const onentryEG = (
        onentryEl as BaseElement
      ).onExecutionGraphConstruction?.(buildContext);
      if (onentryEG) {
        // We'll attach it as a child or we could flatten
        mainStateNode.next!.push(onentryEG);
      }
    }

    // 3. Build sub-states, transitions, etc.
    //    but we have to treat transitions differently than sub-states
    for (const child of buildContext.children) {
      if (child === onentryEl) continue; // skip already handled
      if (!(child instanceof BaseElement)) {
        // TODO: handle as value in parser
        continue;
      }
      if (child.elementType === "transition") {
        // We'll build the transition action
        const txEG = child.onExecutionGraphConstruction?.(buildContext);
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
        const subEG = child.onExecutionGraphConstruction?.(buildContext);
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
        // or other sub constructs
        // you might store them differently
        const onexitEG = child.onExecutionGraphConstruction?.(buildContext);
        if (!onexitEG) {
          // TODO: handle as value in parser
          continue;
        }
        // attach as child
        mainStateNode.next!.push(onexitEG);
      }
    }

    return mainStateNode;
  },
});
