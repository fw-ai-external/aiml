import { raiseConfig } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

export const Raise = createElementDefinition({
  ...raiseConfig,

  async execute(ctx) {
    const { event } = ctx.props;

    if (!event) {
      throw new Error("Raise element requires an 'event' attribute");
    }

    try {
      // Send the event using the context's sendEvent method
      // @ts-expect-error until we fix it lol
      ctx.sendEvent(event);

      return {
        result: ctx.input,
      };
    } catch (error) {
      console.error(`Error in raise element (${event}):`, error);
      throw error;
    }
  },
});
