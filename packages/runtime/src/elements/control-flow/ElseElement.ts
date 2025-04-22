import { z } from "zod";
import { elseConfig } from "@aiml/shared";
import { createElementDefinition } from "../createElementFactory";

const elseSchema = z.object({
  id: z.string().optional(),
});

type ElseProps = z.infer<typeof elseSchema>;

export const Else = createElementDefinition({
  ...elseConfig,
  onExecutionGraphConstruction(buildContext) {
    buildContext.graphBuilder.else();
    buildContext.children.forEach((child) => {
      child.onExecutionGraphConstruction(
        buildContext.createNewContextForChild(child)
      );
    });
    buildContext.graphBuilder.endIf();
  },
});
