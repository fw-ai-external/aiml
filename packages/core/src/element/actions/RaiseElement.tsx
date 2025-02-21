import { createElementDefinition } from "../createElementDefinition";
import { StepValue } from "../../runtime/StepValue";
import { raiseConfig } from "@fireworks/element-types";

export const Raise = createElementDefinition({
  ...raiseConfig,
  async execute(ctx) {
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
