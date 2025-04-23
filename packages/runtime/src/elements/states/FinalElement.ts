import { z } from "zod";
import { finalConfig } from "@aiml/shared";
import { createElementDefinition } from "../createElementFactory";

const finalSchema = z.object({
  id: z.string().optional(),
});

export const Final = createElementDefinition({
  ...finalConfig,
  onExecutionGraphConstruction(buildContext) {
    buildContext.graphBuilder.then();
  },
});
