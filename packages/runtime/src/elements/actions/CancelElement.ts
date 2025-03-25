import { cancelConfig } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

export const Cancel = createElementDefinition({
  ...cancelConfig,
  tag: "cancel" as const,
  role: "action" as const,
  elementType: "cancel" as const,
  allowedChildren: "none" as const,
  async execute(ctx) {
    const { sendid, sendidexpr } = ctx.props;

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

      // // Clear the timeout for the delayed event
      // const timeoutId = ctx.datamodel.getFieldValue(`_timeoutId_${targetId}`);
      // if (typeof timeoutId === "number") {
      //   clearTimeout(timeoutId);
      //   ctx.datamodel.setFieldValue(`_timeoutId_${targetId}`, undefined);
      // }

      return {
        result: ctx.input,
      };
    } catch (error) {
      console.error(
        `Error in cancel element (${sendid || sendidexpr}):`,
        error
      );
      throw error;
    }
  },
});
