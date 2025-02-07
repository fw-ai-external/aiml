import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { BaseElement } from "../../runtime/BaseElement";
import type { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";

const onExitSchema = z.object({
  id: z.string(),
});

type OnExitProps = z.infer<typeof onExitSchema>;

export const OnExit = createElementDefinition({
  tag: "onexit",
  propsSchema: onExitSchema,
  allowedChildren: "any",

  async execute(
    ctx: StepContext<OnExitProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue | null> {
    // Execute all child actions in sequence
    for (const child of childrenNodes) {
      await (child as BaseElement).execute(ctx as any);
    }

    return new StepValue({
      type: "onexit",
      id: ctx.attributes.id,
    });
  },
});
