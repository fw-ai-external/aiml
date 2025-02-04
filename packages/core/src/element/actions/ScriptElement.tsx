import { z } from "zod";
import { createElementDefinition } from "../createElementDefinition";
import type { StepContext } from "../../runtime/StepContext";
import { StepValue } from "../../runtime/StepValue";

const scriptSchema = z.object({
  id: z.string().optional(),
  src: z.string().optional(),
  content: z.string().optional(),
});

export const Script = createElementDefinition({
  tag: "script",
  propsSchema: scriptSchema,
  allowedChildren: "none",

  async execute(
    ctx: StepContext<z.infer<typeof scriptSchema>>
  ): Promise<StepValue> {
    const { src, content } = ctx.attributes;

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

      return new StepValue({
        type: "object",
        object: { src, content },
        raw: JSON.stringify({ src, content }),
      });
    } catch (error) {
      console.error("Error executing script:", error);
      throw error;
    }
  },
});

async function executeScript(
  script: string,
  ctx: StepContext<z.infer<typeof scriptSchema>>
): Promise<void> {
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
