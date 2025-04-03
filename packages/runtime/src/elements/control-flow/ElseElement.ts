import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { ExecutionGraphElement } from "@fireworks/shared";
import type { BaseElement } from "../BaseElement";
import { createElementDefinition } from "../createElementFactory";

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
    // In naive mode, tag="else", when="true"
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
      tag: "else",
      when: "true",
      scope: buildContext.scope,
      attributes: {
        ...buildContext.attributes,
      },
      next: childActions,
    };

    return node;
  },
});
