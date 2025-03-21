import { createElementDefinition } from "../createElementFactory";
import { ExecutionReturnType } from "../../types";
import { scriptConfig } from "@fireworks/shared";
import { StepValue } from "../../StepValue";
import { ElementExecutionContext } from "../../ElementExecutionContext";

export const Script = createElementDefinition({
  ...scriptConfig,
  tag: "script" as const,
  role: "action" as const,
  elementType: "script" as const,
  allowedChildren: "text" as const,
  async execute(ctx, children): Promise<ExecutionReturnType> {
    const { src } = ctx.attributes;
    const content = children[0]?.toString();

    if (!src && !content) {
      throw new Error("Script element requires either 'src' or inline content");
    }

    try {
      if (src) {
        // Load and execute external script
        const response = await fetch(src);
        const script = await response.text();
        await executeScript(script, ctx as any);
      } else if (content) {
        // Execute inline script
        await executeScript(content, ctx as any);
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

    await fn(...Object.values(ctx.datamodel));
  } catch (error) {
    console.error("Error executing script:", error);
    throw error;
  }
}
