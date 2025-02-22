import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import { BaseElement } from "../../runtime/BaseElement";

const historySchema = z.object({
  id: z.string().optional(),
});

type HistoryProps = z.infer<typeof historySchema>;

export const History = createElementDefinition({
  tag: "history",
  propsSchema: historySchema,
  role: "state",
  elementType: "history",
  allowedChildren: ["onentry", "onexit"],
  onExecutionGraphConstruction(buildContext) {
    // Might have a single transition child or onentry blocks
    const childEGs = buildContext.children.map((child) => {
      return (child as BaseElement).onExecutionGraphConstruction?.(
        buildContext.createNewContextForChild(child)
      );
    });
    return {
      id: buildContext.attributes.id,
      type: "state",
      subType: "history",
      key: buildContext.elementKey,
      attributes: {
        ...buildContext.attributes, // e.g. type="shallow/deep"
      },
      children: childEGs,
    };
  },
  async execute(ctx, childrenNodes) {
    // TODO: EMIT a done event
    return ctx.input;
  },
});
