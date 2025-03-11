import { createElementDefinition } from "@fireworks/shared";
import { StepValue } from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
import type { RunstepOutput } from "@fireworks/types";
import { onEntryConfig, OnEntryProps } from "@fireworks/element-config";

export const OnEntry = createElementDefinition<OnEntryProps>({
  ...onEntryConfig,
  role: "action",
  elementType: "onentry",
  async execute(ctx, childrenNodes): Promise<StepValue<RunstepOutput>> {
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

    return new StepValue({
      type: "object",
      object: {
        id: ctx.attributes.id ?? uuidv4(),
        results,
      },
      raw: JSON.stringify({
        id: ctx.attributes.id ?? uuidv4(),
        results,
      }),
    });
  },
});
