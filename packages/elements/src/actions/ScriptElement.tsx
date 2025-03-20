import { createElementDefinition } from "@fireworks/shared";
import type {
  ElementExecutionContext,
  ExecutionReturnType,
} from "@fireworks/types";
import { StepValue } from "@fireworks/shared";
import { scriptConfig } from "@fireworks/element-config";

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
        await executeScript(script, ctx);
      } else if (content) {
        // Execute inline script
        await executeScript(content, ctx);
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

async function executeScript(script: string, ctx: ElementExecutionContext) {
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
