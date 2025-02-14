import { createElementDefinition } from "../createElementDefinition";
import type { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { StepValue } from "../../runtime/StepValue";
import { scriptConfig, ScriptProps } from "@workflow/element-types";

export const Script = createElementDefinition({
  ...scriptConfig,

  async execute(ctx): Promise<StepValue> {
    console.log("=-------------------- Script");
    const { src, value } = ctx.attributes;

    if (!src && !value) {
      throw new Error("Script element requires either 'src' or inline content");
    }

    try {
      if (src) {
        // Load and execute external script
        const response = await fetch(src);
        const script = await response.text();
        await executeScript(script, ctx);
      } else if (value) {
        // Execute inline script
        await executeScript(value, ctx);
      }

      return new StepValue({
        type: "object",
        object: { src, value },
        raw: JSON.stringify({ src, value }),
      });
    } catch (error) {
      console.error("Error executing script:", error);
      throw error;
    }
  },
});

async function executeScript(
  script: string,
  ctx: ElementExecutionContext<ScriptProps>
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
