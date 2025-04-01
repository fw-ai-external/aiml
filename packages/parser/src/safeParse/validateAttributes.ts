import type { Diagnostic } from "@fireworks/shared";
import { DiagnosticSeverity, allElementConfigs } from "@fireworks/shared";
import { fromError } from "zod-validation-error";
import { getPosition } from "../utils/helpers.js";

/**
 * Validates element attributes against their schema definition
 * @param tag The element tag name
 * @param attributes The element's attributes
 * @param diagnostics Set to collect validation diagnostics
 * @returns true if validation passed, false if there were errors
 */
export function validateAttributes(
  node: any,
  attributes: Record<string, any>,
  diagnostics: Set<Diagnostic>
): Set<Diagnostic> {
  // Convert tag to lowercase for case-insensitive matching
  const normalizedTag =
    node.name.toLowerCase() as keyof typeof allElementConfigs;

  // Get the element configuration
  const config = allElementConfigs[normalizedTag];

  // If no config exists for this tag, it's an unknown element
  // We'll allow it through without validation
  if (!config) {
    return diagnostics;
  }

  // Get the schema from the config
  const schema = config.propsSchema;

  // Validate the attributes against the schema
  const result = schema.safeParse(attributes);

  if (!result.success) {
    const lineStart = getPosition(node, "start", "line");
    const columnStart = getPosition(node, "start", "column");
    const lineEnd = getPosition(node, "end", "line");
    const columnEnd = getPosition(node, "end", "column");

    // Add each validation error to diagnostics
    diagnostics.add({
      message: `Invalid props for element <${node.name}>: ${fromError(result.error).toString()}`,
      severity: DiagnosticSeverity.Error,
      code: "ATTR001",
      source: "AIML",
      range: {
        start: { line: lineStart, column: columnStart },
        end: { line: lineEnd, column: columnEnd },
      },
    });

    return diagnostics;
  }

  return diagnostics;
}
