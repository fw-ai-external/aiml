import { dataModelConfig } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

export const DataModel = createElementDefinition({
  ...dataModelConfig,
  tag: "datamodel" as const,
  role: "data-model" as const,
  elementType: "datamodel" as const,
  allowedChildren: ["data"] as const,
});
