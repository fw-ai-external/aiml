import { scriptConfig } from "@aiml/shared";
import type { ElementExecutionContext } from "../../ElementExecutionContext";
import { StepValue } from "../../StepValue";
import type { ExecutionReturnType } from "../../types";
import { createElementDefinition } from "../createElementFactory";

export const Script = createElementDefinition({
  ...scriptConfig,

  async execute(ctx, children): Promise<ExecutionReturnType> {
    const { src } = ctx.props;
    const content = children[0]?.toString();

    if (!content) {
      throw new Error("Script element requires inline content");
    }

    try {
      if (src) {
        throw new Error("Script element does not support src attribute");
      } else if (content) {
        // Execute inline script
        const output = await executeScript(content, ctx as any);
        return {
          result: output ? new StepValue(output) : ctx.input,
        };
      }
      return {
        result: new StepValue({
          type: "object",
          object: { src, content },
          raw: JSON.stringify({ src, content }),
        }),
      };
    } catch (error) {
      console.error("Error executing script:", error);
      throw error;
    }
  },
});

async function executeScript(
  script: string,
  ctx: InstanceType<typeof ElementExecutionContext>
) {
  try {
    // Create a new Function with the script content and execute it with the context
    const fn = new Function(
      ...Object.keys(ctx.datamodel),
      `
        ${script}
      `
    );

    return await fn(...Object.values(ctx.datamodel));
  } catch (error) {
    console.error("Error executing script:", error);
    throw error;
  }
}
