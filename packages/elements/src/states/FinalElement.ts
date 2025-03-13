import { z } from "zod";
import { ExecutionGraphElement } from "@fireworks/types";
import { v4 as uuidv4 } from "uuid";
import { createElementDefinition } from "@fireworks/shared";

const finalSchema = z.object({
  id: z.string().optional(),
});

type FinalProps = { id?: string } & Record<string, any>;

export const Final = createElementDefinition({
  tag: "final",
  propsSchema: finalSchema,
  role: "output",
  elementType: "final",
  allowedChildren: ["onentry", "onexit"],
  onExecutionGraphConstruction(buildContext) {
    const existing = buildContext.getCachedGraphElement(
      buildContext.elementKey
    );

    if (existing) {
      return existing;
    }

    // We might store any onentry blocks or <donedata> in children
    const finalEG: ExecutionGraphElement = {
      id: buildContext.attributes.id || `final_${uuidv4()}`,
      key: buildContext.elementKey,
      type: "state",
      subType: "final",
      attributes: {
        ...buildContext.attributes,
      },
    };
    console.log("finalEG", finalEG);
    buildContext.setCachedGraphElement(
      [buildContext.elementKey, buildContext.attributes.id].filter(Boolean),
      finalEG
    );

    return finalEG;
  },
  async execute(ctx) {
    return ctx.input;
  },
});
