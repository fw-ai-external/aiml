import { dataModelConfig } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

export const DataModel = createElementDefinition({
  ...dataModelConfig,
  onExecutionGraphConstruction: (ctx) => {},
});
