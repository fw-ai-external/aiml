import { ElementExecutionContextSerialized } from "../ElementExecutionContext";
import { sandboxedEval } from "../codeSandbox/JS";

export function parseTemplateLiteral(
  template: string,
  context: ElementExecutionContextSerialized
): string {
  try {
    const result = sandboxedEval(
      "`" + escapeBackticks(template) + "`",
      context as any
    ).toString();
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
