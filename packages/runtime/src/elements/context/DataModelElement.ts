import { dataModelConfig } from "@aiml/shared";
import { createElementDefinition } from "../createElementFactory";

export const DataModel = createElementDefinition({
  ...dataModelConfig,
  onExecutionGraphConstruction: (ctx) => {},
});
