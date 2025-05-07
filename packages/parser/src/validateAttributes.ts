import type { Diagnostic } from "@aiml/shared";
import { DiagnosticSeverity, allElementConfigs } from "@aiml/shared";
import { fromError } from "zod-validation-error";
import { getPosition } from "./utils/helpers.js";
import * as acorn from "acorn";
import { extractTextFromNode } from "./utils/text-extraction.js";
// @ts-expect-error no types
import { Python3Parser } from "dt-python-parser";

type AcornError = {
  message: string;
  pos: number;
  loc: {
    line: number;
    column: number;
  };
};

/**
 * Validates element attributes against their schema definition
 * @param tag The element tag name
 * @param attributes The element's attributes
 * @param diagnostics Set to collect validation diagnostics
 * @returns diagnostics
 */
export function validateAttributes(
  node: { name: string; start?: any; end?: any; children?: any[] },
  attributes: Record<string, any>,
  diagnostics: Set<Diagnostic>
): Set<Diagnostic> {
  const nodeName = node.name;
  const lineStart = getPosition(node, "start", "line");
  const columnStart = getPosition(node, "start", "column");
  const lineEnd = getPosition(node, "end", "line");
  const columnEnd = getPosition(node, "end", "column");

  // Convert tag to lowercase for case-insensitive matching
  const normalizedTag =
    nodeName.toLowerCase() as keyof typeof allElementConfigs;

  // Get the element configuration
  const config = allElementConfigs[normalizedTag];

  // If no config exists for this tag, it's an unknown element
  // We'll allow it through without validation
  if (!config) {
    return diagnostics;
  }

  // Get the schema from the config
  const propsSchema = config.propsSchema;

  if (propsSchema) {
    // Validate the attributes against the schema
    const result = propsSchema.safeParse(attributes);

    if (!result.success) {
      console.log(
        "result.error",
        fromError(result.error).toString(),
        attributes
      );
      // Add each validation error to diagnostics
      diagnostics.add({
        message: `Invalid props for element <${nodeName}>: ${fromError(result.error).toString()}`,
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
  }

  if (normalizedTag === "script") {
    const code = attributes.content || extractTextFromNode(node);
    const language = attributes.language || "javascript";

    if (!code) {
      diagnostics.add({
        message: "Script elements must contain code as a child/children",
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

    if (language === "javascript") {
      try {
        acorn.parse(code, {
          ecmaVersion: "latest",
          sourceType: "module",
        });
      } catch (error: unknown) {
        const codeLineStart = getPosition(node.children?.[0], "start", "line");
        const codeColumnStart = getPosition(
          node.children?.[0],
          "start",
          "column"
        );
        const codeLineEnd = getPosition(node.children?.[0], "end", "line");
        const codeColumnEnd = getPosition(node.children?.[0], "end", "column");

        const syntaxError = error as AcornError;
        diagnostics.add({
          message: `JavaScript syntax error: ${syntaxError.message}`,
          severity: DiagnosticSeverity.Error,
          code: "SCRIPT001",
          source: "AIML",
          range: {
            start: { line: codeLineStart, column: codeColumnStart },
            end: { line: codeLineEnd, column: codeColumnEnd },
          },
        });
      }
    }

    if (language === "python") {
      // TODO validate python code using an AST then typecheck somehow
      const parser = new Python3Parser();
      try {
        parser.parse(code);
      } catch (error: any) {
        const codeLineStart = getPosition(node.children?.[0], "start", "line");
        const codeColumnStart = getPosition(
          node.children?.[0],
          "start",
          "column"
        );
        const codeLineEnd = getPosition(node.children?.[0], "end", "line");
        const codeColumnEnd = getPosition(node.children?.[0], "end", "column");

        // Attempt to extract a meaningful error message
        const errorMessage = error.message || "Unknown Python syntax error";

        diagnostics.add({
          message: `Python syntax error: ${errorMessage}`,
          severity: DiagnosticSeverity.Error,
          code: "SCRIPT002", // Use a new code for Python errors
          source: "AIML",
          range: {
            start: { line: codeLineStart, column: codeColumnStart },
            end: { line: codeLineEnd, column: codeColumnEnd },
          },
        });
      }
    }
  }

  return diagnostics;
}
