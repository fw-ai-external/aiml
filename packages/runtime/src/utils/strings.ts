import type { ElementExecutionContextSerialized } from "../ElementExecutionContext";
import { sandboxedEval } from "../codeSandbox/JS";

export async function parseTemplateLiteral(
  template: string,
  context: ElementExecutionContextSerialized
): Promise<string> {
  try {
    // if template consains `${input}` and never `${input.`, replace context.input with context.inputAsText
    if (template.includes("${input}") && !template.includes("${input.}")) {
      template = template.replace("${input}", context.inputAsText);
    }

    const result = await sandboxedEval(
      "`" + escapeBackticks(template) + "`",
      context as any
    );

    // Convert non-object results to string
    const finalResult =
      typeof result !== "object" ? result : result?.toString();

    if (
      template.trim() !== "" &&
      (result === undefined || result === null || result.trim() === "")
    ) {
      throw new Error(
        `Error evaluating expression: ${template.trim()}: result is undefined, null, or empty`
      );
    }
    return finalResult;
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
