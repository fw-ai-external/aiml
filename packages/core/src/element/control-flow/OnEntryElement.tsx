import { createElementDefinition } from "../createElementDefinition";
import type { BaseElement } from "../../runtime/BaseElement";
import { ElementExecutionContext } from "../../runtime/ElementExecutionContext";
import { StepValue } from "../../runtime/StepValue";
import { v4 as uuidv4 } from "uuid";
import type { RunstepOutput } from "../../types";
import { onEntryConfig, OnEntryProps } from "@fireworks/element-types";

export const OnEntry = createElementDefinition<OnEntryProps>({
  ...onEntryConfig,
  role: "action",
  elementType: "onentry",
  async execute(
    ctx: ElementExecutionContext<OnEntryProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue> {
    // Execute all child actions in sequence
    const results: StepValue<RunstepOutput>[] = [];
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
