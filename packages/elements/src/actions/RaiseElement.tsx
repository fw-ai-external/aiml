import { createElementDefinition } from "@fireworks/shared";
import { StepValue } from "@fireworks/shared";
import { raiseConfig, RaiseProps } from "@fireworks/element-config";

export const Raise = createElementDefinition<RaiseProps>({
  ...raiseConfig,
  role: "action",
  elementType: "raise",
  allowedChildren: "none",
  async execute(ctx) {
    const { event } = ctx.attributes;

    if (!event) {
      throw new Error("Raise element requires an 'event' attribute");
    }

    try {
      // Send the event using the context's sendEvent method
      // @ts-expect-error until we fix it lol
      ctx.sendEvent(event);

      const resultObject = { event };

      return new StepValue({
        type: "object",
        object: resultObject,
        raw: JSON.stringify(resultObject),
      });
    } catch (error) {
      console.error(`Error in raise element (${event}):`, error);
      throw error;
    }
  },
});
