import { createFireworks } from "@ai-sdk/fireworks";
import {
  extractReasoningMiddleware,
  wrapLanguageModel,
  generateObject,
} from "ai";
import { z } from "zod";

const fireworks = createFireworks({
  apiKey: "fw_3ZcoZYaRUVPbhAHUiXsjBUt1",
});

const model = wrapLanguageModel({
  model: fireworks("accounts/fireworks/models/deepseek-r1", {}),
  middleware: extractReasoningMiddleware({ tagName: "think" }),
});

const r = await generateObject({
  model,
  maxTokens: 4000,
  schema: z.object({
    ingredients: z.array(
      z.object({
        name: z.string(),
        quantity: z.string(),
        unit: z.string(),
      })
    ),
  }),
  prompt: "Write a grocery list for a vegetarian lasagna recipe for 4 people.",
});

console.log(r.object);
