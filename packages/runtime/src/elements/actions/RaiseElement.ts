import { createElementDefinition } from "../createElementFactory";
import { StepValue } from "../../StepValue";
import { raiseConfig } from "@fireworks/shared";

export const Raise = createElementDefinition({
  ...raiseConfig,
  tag: "raise" as const,
  role: "action" as const,
  elementType: "raise" as const,
  allowedChildren: "none" as const,
  async execute(ctx) {
    const { event } = ctx.props;

    if (!event) {
      throw new Error("Raise element requires an 'event' attribute");
    }

    try {
      // Send the event using the context's sendEvent method
      // @ts-expect-error until we fix it lol
      ctx.sendEvent(event);

      const resultObject = { event };

      return {
        result: new StepValue({
          type: "object",
          object: resultObject,
          raw: JSON.stringify(resultObject),
        }),
      };
    } catch (error) {
      console.error(`Error in raise element (${event}):`, error);
      throw error;
    }
  },
});
