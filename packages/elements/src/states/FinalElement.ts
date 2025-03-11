import { z } from "zod";
import { ExecutionGraphElement } from "@fireworks/types";
import { BaseElement } from "@fireworks/shared";
import { StepValue } from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
import { createElementDefinition } from "@fireworks/shared";

const finalSchema = z.object({
  id: z.string().optional(),
});

type FinalProps = { id?: string } & Record<string, any>;

export const Final = createElementDefinition({
  tag: "final",
  propsSchema: finalSchema,
  role: "output",
  elementType: "final",
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
      id: buildContext.attributes.id || `final_${uuidv4()}`,
      key: buildContext.elementKey,
      type: "output",
      subType: "final",
      attributes: {
        ...buildContext.attributes,
      },
      next: childEGs,
    };
  },
  async execute(ctx, childrenNodes) {
    // TODO: EMIT a done event
    return new StepValue({
      type: "object",
      object: {
        id: ctx.attributes.id ?? uuidv4(),
        done: true,
      },
      raw: JSON.stringify({
        id: ctx.attributes.id ?? uuidv4(),
        done: true,
      }),
    });
  },
});
