import { createElementDefinition } from "../createElementFactory";

import {
  type DataElementMetadata as ImportedDataElementMetadata,
  type JSONSchema as ImportedJSONSchema,
  ValueType,
  dataConfig,
} from "@fireworks/shared";

// Re-export for backward compatibility
export { ValueType };
export type DataElementMetadata = ImportedDataElementMetadata;
export type JSONSchema = ImportedJSONSchema;

export const Data = createElementDefinition({
  ...dataConfig,
  onExecutionGraphConstruction: (ctx) => {},
});
