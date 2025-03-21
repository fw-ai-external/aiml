import { createElementDefinition } from "../createElementFactory";
import { onEntryConfig } from "@fireworks/shared";

export const OnEntry = createElementDefinition({
  ...onEntryConfig,
  role: "action",
  elementType: "onentry",
  async execute(ctx, childrenNodes) {
    // Execute all child actions in sequence
    const results: any[] = [];
    for (const child of childrenNodes) {
      if (typeof child.execute === "function") {
        // Pass the context directly to child execution
        const result = await child.execute(ctx);
        if (result) {
          results.push(result);
        }
      }
    }

    return {
      result: ctx.input,
    };
  },
});
