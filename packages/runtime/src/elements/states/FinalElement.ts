import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { ExecutionGraphElement } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

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
    // We might store any onentry blocks or <donedata> in children
    const finalEG: ExecutionGraphElement = {
      id: buildContext.attributes.id || `final_${uuidv4()}`,
      key: buildContext.elementKey,
      type: this.role,
      tag: "final",
      scope: buildContext.scope,
      attributes: {
        ...buildContext.attributes,
      },
    };

    console.log(
      `Registering final state with ID: ${finalEG.id} and key: ${finalEG.key}`
    );

    console.log("Final element registered successfully");

    return finalEG;
  },
});
