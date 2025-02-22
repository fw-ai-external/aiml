import { createElementDefinition } from "../createElementDefinition";
import { StepValue } from "../../runtime/StepValue";
import { cancelConfig, CancelProps } from "@fireworks/element-config";

export const Cancel = createElementDefinition<CancelProps>({
  ...cancelConfig,
  role: "action",
  elementType: "cancel",
  allowedChildren: "none",
  async execute(ctx) {
    const { sendid, sendidexpr } = ctx.attributes;

    if (!sendid && !sendidexpr) {
      throw new Error(
        "Cancel element requires either 'sendid' or 'sendidexpr' attribute"
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

      // Evaluate expression if provided
      const targetId = sendidexpr
        ? String(evaluateExpression(sendidexpr))
        : sendid;

      // Clear the timeout for the delayed event
      const timeoutId = ctx.datamodel[`_timeoutId_${targetId}`];
      if (typeof timeoutId === "number") {
        clearTimeout(timeoutId);
        delete ctx.datamodel[`_timeoutId_${targetId}`];
      }

      return new StepValue({
        type: "object",
        object: { sendid: targetId },
        raw: JSON.stringify({ sendid: targetId }),
      });
    } catch (error) {
      console.error(
        `Error in cancel element (${sendid || sendidexpr}):`,
        error
      );
      throw error;
    }
  },
});
