import type { JSONSchemaToZod } from "@dmitryrechkin/json-schema-to-zod";
import type { DataElementMetadata } from "./values/data-types";
export type { DataElementMetadata };

// Define field types
type FieldType = "string" | "number" | "boolean" | "json";

// Field definition interface
export interface FieldDefinition {
  type: FieldType;
  // Whether the field is read-only, meaning the value is static and cannot be changed
  // via the workflow
  readonly: boolean;
  // Whether the field is set from the request, the value is an aditional input in the request body
  // when this is true, the value is also read-only
  fromRequest: boolean;
  // The default value of the field if no other value is set or provided
  defaultValue: any;
  // The schema of the field, used to validate the field value
  schema: Parameters<typeof JSONSchemaToZod.convert>[0];
}

// Data model interface - collection of fields
export interface DataModel {
  [fieldName: string]: FieldDefinition;
}

// Storage for field values
export interface FieldValues {
  [fieldName: string]: any;
}
