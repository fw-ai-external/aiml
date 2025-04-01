import { z, ZodIssueCode } from "zod";
import type { RefinementCtx } from "zod";
import * as acorn from "acorn";

// Regex to check for characters typical in simple strings, avoiding backticks and ${}
// Adjust this regex based on the exact character set you want to allow in simple strings.
// This example allows letters, numbers, spaces, and common punctuation, but not backticks.
const simpleStringRegex = /^[\w\s.,!?'"()\-+=\/\*:;]*$/;

// Custom Zod schema for validating JavaScript expressions
export const jsExpressionSchema = z
  .string() // Start with string type
  .optional() // Make it optional
  // Use .superRefine() for complex validation involving ctx
  .superRefine((val: string | undefined, ctx: RefinementCtx) => {
    // If val is undefined (due to .optional()), it's valid.
    if (val === undefined) {
      return; // Pass validation
    }

    // Handle JSX/MDX expression syntax
    if (val.startsWith("{") && val.endsWith("}")) {
      // Extract the expression inside curly braces
      const expr = val.slice(1, -1);
      try {
        acorn.parse(expr, { ecmaVersion: "latest", sourceType: "script" });
        // Parsing succeeded, no action needed
        return;
      } catch (e: unknown) {
        let message = "Invalid JavaScript expression";
        if (e instanceof Error) {
          // Extract the message up to the first line break
          message = e.message.split("\n")[0] || "Invalid syntax";
        }
        // Add the specific parse error as a custom issue
        ctx.addIssue({
          code: ZodIssueCode.custom,
          message: message,
        });
        return;
      }
    }

    // If not in curly braces, try parsing directly
    try {
      acorn.parse(val, { ecmaVersion: "latest", sourceType: "script" });
      // Parsing succeeded, no action needed
    } catch (e: unknown) {
      let message = "Invalid JavaScript expression";
      if (e instanceof Error) {
        // Extract the message up to the first line break
        message = e.message.split("\n")[0] || "Invalid syntax";
      }
      // Add the specific parse error as a custom issue
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: message,
      });
    }
  });

export const jsTemplateStringSchema = z
  .string()
  .optional()
  .superRefine((val: string | undefined, ctx: RefinementCtx) => {
    if (val === undefined) {
      return; // Optional case is valid
    }

    // Always validate plain strings
    if (simpleStringRegex.test(val)) {
      return; // Simple strings are always valid
    }

    // For strings with template-like syntax, check if they'd be valid inside backticks
    try {
      // Try parsing the input as if it were wrapped in backticks
      acorn.parse(`\`${val}\``, {
        ecmaVersion: "latest",
        sourceType: "script",
      });

      // If we get here, it parsed successfully as a template literal
      return; // Valid
    } catch (e: unknown) {
      // If parsing fails, it's not a valid template string
      let message = "Invalid template string syntax";
      if (e instanceof Error) {
        message = e.message.split("\n")[0] || "Invalid syntax";
      }

      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: message,
      });
    }
  });
