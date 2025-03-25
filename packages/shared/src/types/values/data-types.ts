/**
 * ValueType - Enum for data element types
 */
export enum ValueType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  JSON = "json", // For complex nested structures with schema
}

/**
 * JSON Schema for data validation
 */
export interface JSONSchema {
  type: ValueType;
  properties?: Record<string, JSONSchema>; // For objects
  items?: JSONSchema; // For arrays
  required?: string[]; // Required properties for objects
  enum?: any[]; // Enumerated values
  const?: any; // Fixed value
  pattern?: string; // Regex pattern for strings
  minimum?: number; // Minimum value for numbers
  maximum?: number; // Maximum value for numbers
  minLength?: number; // Minimum length for strings and arrays
  maxLength?: number; // Maximum length for strings and arrays
  additionalProperties?: boolean | JSONSchema; // Additional properties validation
  format?: string; // Format validation (date, email, etc.)
  default?: any; // Default value
  examples?: any[]; // Example values
}

/**
 * DataElementMetadata - Metadata for data elements
 */
export interface DataElementMetadata {
  /**
   * The type of the data element
   */
  type: ValueType | string;

  /**
   * Whether the data element is readonly
   */
  readonly: boolean;

  /**
   * The ID of the data element
   */
  id: string;

  /**
   * Whether the data element gets its value from the request
   */
  fromRequest: boolean;

  /**
   * The ID of the parent state for scope determination
   */
  parentStateId: string | null;

  /**
   * Schema for complex data types
   */
  schema?: JSONSchema;
}

/**
 * Validate a value against a type
 * @param value The value to validate
 * @param type The type to validate against
 * @param schema Optional schema for complex types
 * @returns The validated value
 * @throws Error if the value does not match the type
 */
export function validateValueType(
  value: any,
  type: ValueType | string,
  schema?: JSONSchema
): any {
  switch (type) {
    case ValueType.STRING:
      if (typeof value !== "string") {
        throw new Error(`Value must be a string, got ${typeof value}`);
      }

      // Validate string against schema if provided
      if (schema) {
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
          throw new Error(`String does not match pattern: ${schema.pattern}`);
        }

        if (schema.minLength !== undefined && value.length < schema.minLength) {
          throw new Error(`String length must be at least ${schema.minLength}`);
        }

        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
          throw new Error(`String length must be at most ${schema.maxLength}`);
        }

        if (schema.enum && !schema.enum.includes(value)) {
          throw new Error(`Value must be one of: ${schema.enum.join(", ")}`);
        }
      }

      return value;

    case ValueType.NUMBER:
      if (typeof value !== "number" || isNaN(value)) {
        throw new Error(`Value must be a number, got ${typeof value}`);
      }

      // Validate number against schema if provided
      if (schema) {
        if (schema.minimum !== undefined && value < schema.minimum) {
          throw new Error(`Number must be at least ${schema.minimum}`);
        }

        if (schema.maximum !== undefined && value > schema.maximum) {
          throw new Error(`Number must be at most ${schema.maximum}`);
        }

        if (schema.enum && !schema.enum.includes(value)) {
          throw new Error(`Value must be one of: ${schema.enum.join(", ")}`);
        }
      }

      return value;

    case ValueType.BOOLEAN:
      if (typeof value !== "boolean") {
        throw new Error(`Value must be a boolean, got ${typeof value}`);
      }
      return value;

    case ValueType.JSON:
      // For JSON type, we need a schema
      if (!schema) {
        throw new Error("Schema is required for JSON type");
      }

      // If it's an object
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Validate object against schema if provided
        if (schema.properties) {
          const validatedObject: Record<string, any> = {};

          // Check required properties
          if (schema.required) {
            for (const requiredProp of schema.required) {
              if (!(requiredProp in value)) {
                throw new Error(`Missing required property: ${requiredProp}`);
              }
            }
          }

          // Validate each property against its schema
          for (const [propName, propSchema] of Object.entries(
            schema.properties
          )) {
            if (propName in value) {
              validatedObject[propName] = validateValueType(
                value[propName],
                propSchema.type,
                propSchema
              );
            }
          }

          return validatedObject;
        }
      }

      // If it's an array
      if (Array.isArray(value)) {
        // Validate array against schema if provided
        if (schema.minLength !== undefined && value.length < schema.minLength) {
          throw new Error(`Array length must be at least ${schema.minLength}`);
        }

        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
          throw new Error(`Array length must be at most ${schema.maxLength}`);
        }

        // Validate each item against the items schema if provided
        if (schema.items) {
          return value.map((item) =>
            validateValueType(item, schema.items!.type, schema.items)
          );
        }
      }

      return value;

    default:
      return value;
  }
}

/**
 * Get a default value for a type
 * @param type The type to get a default value for
 * @param schema Optional schema for complex types
 * @returns The default value for the type
 */
export function getDefaultForType(
  type: ValueType | string,
  schema?: JSONSchema
): any {
  switch (type) {
    case ValueType.STRING:
      return schema?.enum?.[0] ?? "";
    case ValueType.NUMBER:
      return schema?.enum?.[0] ?? 0;
    case ValueType.BOOLEAN:
      return schema?.enum?.[0] ?? false;
    case ValueType.JSON:
      if (!schema) {
        throw new Error("Schema is required for JSON type");
      }

      // If it's an object type with properties
      if (schema.properties) {
        const defaultObj: Record<string, any> = {};
        for (const [propName, propSchema] of Object.entries(
          schema.properties
        )) {
          // Only set default for required properties
          if (schema.required?.includes(propName)) {
            defaultObj[propName] = getDefaultForType(
              propSchema.type,
              propSchema
            );
          }
        }
        return defaultObj;
      }

      // If it's an array type with items
      if (schema.items) {
        // Return empty array or array with one default item
        return schema.minLength && schema.minLength > 0
          ? [getDefaultForType(schema.items.type, schema.items)]
          : [];
      }

      // Default JSON value
      return {};
    default:
      return ""; // Default to empty string
  }
}
