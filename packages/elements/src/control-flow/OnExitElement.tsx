import { createElementDefinition, BaseElement } from "@fireworks/shared";
import { StepValue } from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
import {
  ElementExecutionContext,
  onExitConfig,
  OnExitProps,
} from "@fireworks/element-config";
import { RunstepOutput } from "@fireworks/types";

export const OnExit = createElementDefinition<OnExitProps>({
  ...onExitConfig,
  role: "action",
  elementType: "onexit",
  async execute(
    ctx: ElementExecutionContext<OnExitProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue<RunstepOutput>> {
    // Execute all child actions in sequence
    const results: any[] = [];
    for (const child of childrenNodes) {
      if (typeof child.execute === "function") {
        // Pass the context directly to child execution
        const result = await child.execute(ctx as any);
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
