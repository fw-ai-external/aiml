import { z, ZodIssueCode } from "zod";
import type { RefinementCtx } from "zod";
import * as acorn from "acorn";

// Regex to check for characters typical in simple strings, avoiding backticks and ${}
// Adjust this regex based on the exact character set you want to allow in simple strings.
// This example allows letters, numbers, spaces, and common punctuation, but not backticks.
const simpleStringRegex = /^[\w\s.,!?'"()\-+=\/\*:;]*$/;
export const jsCodeStringSchema = z
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
      console.log("val", `\`${val}\``);
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

export const elementExecutionContextSerializedSchema = z.object({
  input: z.union([
    z.string(),
    z.object({} as any),
    z.boolean(),
    z.null(),
    z.array(z.any()),
  ]),
  props: z.object({} as any),
  datamodel: z.object({} as any),
  requestInput: z.object({
    userMessage: z.any(),
    systemMessage: z.string().optional(),
    chatHistory: z.array(
      z.object({
        role: z.enum([
          "user",
          "assistant",
          "tool-call",
          "tool-response",
          "system",
        ]),
        content: z.union([
          z.string(),
          z.object({
            type: z.union([z.literal("text"), z.literal("image")]),
            text: z.string().optional(),
            image: z.string().optional(),
          }),
        ]),
      })
    ),
    clientSideTools: z.array(
      z.object({
        type: z.literal("function"),
        function: z.object({
          name: z.string(),
          description: z.string(),
          parameters: z.object({
            type: z.literal("object"),
            properties: z.record(z.string(), z.any()),
            required: z.array(z.string()),
          }),
        }),
      })
    ),
  }),
  machine: z.object({
    id: z.string(),
    secrets: z.object({} as any),
  }),
  run: z.object({
    id: z.string(),
  }),
  element: z.object({
    id: z.string(),
    type: z.string(),
    props: z.object({} as any),
    children: z.array(z.any()),
  }),
});

export const elementExpressionCallbackSchema = z.union([
  z
    .function()
    .args(elementExecutionContextSerializedSchema)
    .returns(z.any())
    .superRefine((val, ctx: RefinementCtx) => {
      if (typeof val !== "function") {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          message: "Expected a function",
        });
      }

      val.toString();
    }),
  jsCodeStringSchema,
]);

export const elementArrayExpressionCallbackSchema = z.union([
  z
    .function()
    .args(elementExecutionContextSerializedSchema)
    .returns(z.array(z.any()))
    .superRefine((val, ctx: RefinementCtx) => {
      if (typeof val !== "function") {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          message: "Expected a function",
        });
      }

      return val.toString();
    }),
  jsCodeStringSchema,
]);

export const elementConditionCallbackSchema = z.union([
  z
    .function()
    .args(elementExecutionContextSerializedSchema)
    .returns(z.boolean())
    .superRefine((val, ctx: RefinementCtx) => {
      return val.toString();
    }),
  jsCodeStringSchema,
]);

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
