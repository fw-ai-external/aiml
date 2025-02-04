import { createOpenAI } from "@ai-sdk/openai";
import type { JSONSchema as JsonSchemaType } from "openai/lib/jsonschema";
import { z } from "zod";
import { generateObjectWithCache } from "../ai";

const fireworks = createOpenAI({
  apiKey: process.env.FIREWORKS_API_KEY ?? "",
  baseURL: "https://api.fireworks.ai/inference/v1",
});

// TODO not yet working

export async function extractTemplateSchemaFromString(
  template: string
): Promise<Record<string, JsonSchemaType>> {
  const regex = /\$\{([^}]+)\}/g;
  const schema: Record<string, JsonSchemaType> = {};

  const expressions: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (match[1] === undefined) {
      throw new Error("Match cannot be undefined");
    }
    expressions.push(match[1]);
  }

  if (expressions.length > 0) {
    const object = await generateObjectWithCache({
      model: fireworks("accounts/fireworks/models/llama-v3p1-70b-instruct"),
      schema: z.object({
        input: z.record(z.string(), z.any()),
        inputs: z.record(z.string(), z.any()),
        context: z.record(z.string(), z.any()),
      }),
      prompt: `Based on these JS template strings, what is the json schema that would define inputs.

## Template Strings:
- \${${expressions.join("\n- ")}}

Respond back in the following format and nothing else at all!!! 

## Output Format:

{
  "input": ... json schema for the input,
  "inputs": ... json schema for the inputs,
  "context": ... json schema for the context
}
  
## important!
Only respond with the jsonschema for the variables input, inputs, and context, and only for the ones that are used in the template strings.`,
    });

    return object.object as any;
  }
  return schema;
}
