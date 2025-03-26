import type { ElementExecutionContextSerialized } from "../ElementExecutionContext";
import { sandboxedEval } from "../codeSandbox/JS";

export async function parseTemplateLiteral(
  template: string,
  context: ElementExecutionContextSerialized
): Promise<string> {
  try {
    const result = JSON.stringify(
      await sandboxedEval("`" + escapeBackticks(template) + "`", context as any)
    );
    if (
      template.trim() !== "" &&
      (result === undefined || result === null || result.trim() === "")
    ) {
      throw new Error(
        `Error evaluating expression: ${template.trim()}: result is undefined, null, or empty`
      );
    }
    return result;
  } catch (error: any) {
    throw new Error(
      `Error evaluating expression: ${template.trim()}: ${error.message}`,
      {
        cause: "template_literal_error",
      }
    );
  }
}

function escapeBackticks(input: string): string {
  return input.replace(/```/g, "\\`\\`\\`");
}
