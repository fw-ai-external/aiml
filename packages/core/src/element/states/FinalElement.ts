import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import { ExecutionGraphElement } from "../../runtime/types";
import { BaseElement } from "../../runtime/BaseElement";

const finalSchema = z.object({
  id: z.string().optional(),
});

type FinalProps = z.infer<typeof finalSchema>;

export const Final = createElementDefinition({
  tag: "final",
  propsSchema: finalSchema,
  role: "output",
  allowedChildren: ["onentry", "onexit"],
  onExecutionGraphConstruction(buildContext) {
    // final typically doesn't have sub-states, but might have onentry or data
    const childEGs = buildContext.children
      .map((child) => {
        if (child instanceof BaseElement) {
          return child.onExecutionGraphConstruction?.(
            buildContext.createNewContextForChild(child)
          );
        }
      })
      .filter(Boolean) as ExecutionGraphElement[];

    // We might store any onentry blocks or <donedata> in children
    return {
      id: buildContext.attributes.id,
      type: "step", // or "action" if you prefer
      subType: "final",
      attributes: {
        ...buildContext.attributes,
      },
      next: childEGs,
    };
  },
  async execute(ctx, childrenNodes) {
    // TODO: EMIT a done event
    return ctx.input;
  },
});
