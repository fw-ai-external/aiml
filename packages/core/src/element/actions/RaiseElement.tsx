import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";

const raiseSchema = z.object({
  id: z.string().optional(),
  event: z.string(),
});

export const Raise = createElementDefinition({
  tag: "raise",
  propsSchema: raiseSchema,
  allowedChildren: "none",

  async execute(
    ctx: StepContext<z.infer<typeof raiseSchema>>
  ): Promise<StepValue> {
    const { event } = ctx.attributes;

    try {
      // Send the event using the context's sendEvent method
      // @ts-expect-error until we fix it lol
      ctx.sendEvent(event);

      return new StepValue({
        type: "object",
        object: { event },
        raw: JSON.stringify({ event }),
      });
    } catch (error) {
      console.error(`Error in raise element (${event}):`, error);
      throw error;
    }
  },
});
