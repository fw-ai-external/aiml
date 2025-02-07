import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import { BuildContext } from "../../runtime/BuildContext";
import { ExecutionGraphElement } from "../../runtime/types";
import { v4 as uuidv4 } from "uuid";
import { BaseElement } from "../../runtime/BaseElement";
const elseIfSchema = z.object({
  id: z.string().optional(),
  cond: z.string(),
});

type ElseIfProps = z.infer<typeof elseIfSchema>;

export const ElseIf = createElementDefinition({
  tag: "elseif",
  propsSchema: elseIfSchema,
  allowedChildren: "any",

  onExecutionGraphConstruction(
    buildContext: BuildContext
  ): ExecutionGraphElement {
    // In practice, we won't typically build anything stand-alone here,
    // because IfElement is gathering them.
    // But if you want to do a naive version:

    const cached = buildContext.getCachedGraphElement(
      buildContext.attributes.id
    );
    if (cached) return cached;

    // We'll produce a node with subType="elseif".
    // The actual short-circuit condition is appended in IfElement code.
    const childActions: ExecutionGraphElement[] = buildContext.children
      .map((c) =>
        "tag" in c
          ? (c as BaseElement).onExecutionGraphConstruction?.(
              buildContext.createNewContextForChild(c)
            )
          : null
      )
      .filter((c) => c !== null) as ExecutionGraphElement[];

    const condVal = buildContext.attributes.cond || "false";
    const node: ExecutionGraphElement = {
      id: buildContext.attributes.id || `elseif_${uuidv4()}`,
      type: "step",
      subType: "elseif",
      // 'when' might be naive. True short-circuit is built in IfElement
      when: condVal,
      attributes: {
        ...buildContext.attributes,
      },
      next: childActions,
    };

    buildContext.setCachedGraphElement(node.id, node);
    return node;
  },
});
