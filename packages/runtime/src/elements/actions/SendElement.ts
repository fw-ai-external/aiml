import { createElementDefinition } from "../createElementFactory";
import { StepValue } from "../../StepValue";
import { sendConfig } from "@fireworks/shared";

export const Send = createElementDefinition({
  ...sendConfig,
  tag: "send" as const,
  role: "action" as const,
  elementType: "send" as const,
  allowedChildren: "none" as const,
  async execute(ctx) {
    const {
      event,
      eventexpr,
      target,
      targetexpr,
      type = "scxml",
      id,
      delay,
      delayexpr,
      namelist,
    } = ctx.props;

    if (!event && !eventexpr) {
      throw new Error(
        "Send element requires either 'event' or 'eventexpr' attribute"
      );
    }

    try {
      // Create a function that evaluates expressions in the context of the datamodel
      const evaluateExpression = (expression: string) => {
        const fn = new Function(
          ...Object.keys(ctx.datamodel),
          `return ${expression}`
        );
        return fn(...Object.values(ctx.datamodel));
      };

      // Evaluate expressions if provided
      const eventName = eventexpr
        ? String(evaluateExpression(eventexpr))
        : event;
      const targetName = targetexpr
        ? String(evaluateExpression(targetexpr))
        : target;
      const delayMs = delayexpr
        ? Number(evaluateExpression(delayexpr))
        : delay
          ? parseInt(delay, 10)
          : 0;

      // Create event data from namelist or data attributes
      const eventData: Record<string, unknown> = {};

      if (namelist) {
        const names = namelist.split(" ");
        for (const name of names) {
          eventData[name] = ctx.datamodel[name];
        }
      }

      // Handle different target types
      switch (type) {
        case "scxml":
          if (delayMs > 0) {
            // For delayed events, store the timeout ID in the data model
            const timeoutId = setTimeout(() => {
              // @ts-expect-error until we fix it lol
              ctx.sendEvent(eventName!, eventData);
            }, delayMs);

            if (id) {
              ctx.datamodel[`_timeoutId_${id}`] = timeoutId;
            }
          } else {
            // @ts-expect-error until we fix it lol
            ctx.sendEvent(eventName!, eventData);
          }
          break;

        case "http":
          // Implement HTTP request sending
          if (targetName) {
            const response = await fetch(targetName, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                event: eventName,
                data: eventData,
              }),
            });

            if (!response.ok) {
              throw new Error(`HTTP send failed: ${response.statusText}`);
            }
          }
          break;

        default:
          throw new Error(`Unsupported send type: ${type}`);
      }

      return {
        result: new StepValue({
          type: "object",
          object: {
            event: eventName,
            target: targetName,
            data: eventData,
          },
          raw: JSON.stringify({
            event: eventName,
            target: targetName,
            data: eventData,
          }),
        }),
      };
    } catch (error) {
      console.error(`Error in send element (${event || eventexpr}):`, error);
      throw error;
    }
  },
});
