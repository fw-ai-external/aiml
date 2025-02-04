import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { BaseElement } from "../BaseElement";
import type { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";
import { v4 as uuidv4 } from "uuid";
const onEntrySchema = z.object({
  id: z.string().optional(),
});

type OnEntryProps = z.infer<typeof onEntrySchema>;

export const OnEntry = createElementDefinition({
  tag: "onentry",
  propsSchema: onEntrySchema,
  allowedChildren: "any",

  async execute(
    ctx: StepContext<OnEntryProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue | null> {
    // Execute all child actions in sequence
    for (const child of childrenNodes) {
      // @ts-expect-error but also...
      // TODO: we should not be executing children inside a parent element
      await child.execute?.(ctx);
    }

    return new StepValue({
      type: "onentry",
      id: ctx.attributes.id ?? uuidv4(),
    });
  },
});
