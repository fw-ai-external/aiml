import { sendConfig } from "@fireworks/shared";
import { StepValue } from "../../StepValue";
import { createElementDefinition } from "../createElementFactory";

export const Send = createElementDefinition({
  ...sendConfig,

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

    // Create a function that evaluates expressions in the context of the datamodel
    const evaluateExpression = (expression: string) => {
      const fn = new Function(
        ...Object.keys(ctx.datamodel),
        `return ${expression}`
      );
      return fn(...Object.values(ctx.datamodel));
    };

    // Evaluate expressions if provided
    const eventName = eventexpr ? String(evaluateExpression(eventexpr)) : event;
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
        eventData[name] = ctx.datamodel.get(name);
      }
    }

    // Handle different target types
    switch (type) {
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
            return {
              result: ctx.input,
              exception: `HTTP send failed: ${response.statusText} ${await response.text()}`,
            };
          }

          return {
            result: new StepValue({
              type: "object",
              object: await response.json(),
            }),
          };
        }
        break;

      default:
        throw new Error(`Unsupported send type: ${type}`);
    }

    return {
      result: ctx.input,
    };
  },
});
