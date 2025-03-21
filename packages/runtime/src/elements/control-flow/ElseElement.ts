import { z } from "zod";
import { createElementDefinition } from "../createElementFactory";
import { BaseElement } from "../BaseElement";
import { ExecutionGraphElement } from "../../types";
import { v4 as uuidv4 } from "uuid";

const elseSchema = z.object({
  id: z.string().optional(),
});

type ElseProps = z.infer<typeof elseSchema>;

export const Else = createElementDefinition({
  tag: "else",
  propsSchema: elseSchema,
  role: "state",
  elementType: "else",
  allowedChildren: "any",

  onExecutionGraphConstruction(buildContext): ExecutionGraphElement {
    const cached = buildContext.getCachedGraphElement(
      buildContext.attributes.id
    );
    if (cached) return cached;

    // In naive mode, subType="else", when="true"
    // The IfElement logic will combine short-circuit for doc order.
    const childActions: ExecutionGraphElement[] = buildContext.children
      .map((ch) =>
        "tag" in ch
          ? (ch as BaseElement).onExecutionGraphConstruction?.(
              buildContext.createNewContextForChild(ch)
            )
          : null
      )
      .filter((ch) => ch !== null) as ExecutionGraphElement[];

    const node: ExecutionGraphElement = {
      id: buildContext.attributes.id || `else_${uuidv4()}`,
      key: buildContext.elementKey,
      type: "state",
      subType: "else",
      when: "true",
      attributes: {
        ...buildContext.attributes,
      },
      next: childActions,
    };

    buildContext.setCachedGraphElement(
      [buildContext.attributes.id, node.key].filter(Boolean),
      node
    );
    return node;
  },
});
