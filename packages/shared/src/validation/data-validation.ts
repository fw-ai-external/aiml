/**
 * Validates a value against a specified type and optional schema
 *
 * @param value The value to validate
 * @param type The expected type (string, number, boolean, json)
 * @param schema Optional schema for JSON validation
 * @throws Error if validation fails
 */
export function validateDataValue(
  value: any,
  type: string,
  schema?: Record<string, any>
): void {
  switch (type) {
    case "string":
      if (typeof value !== "string") {
        throw new Error(`Expected string, got ${typeof value}`);
      }
      break;

    case "number":
      if (typeof value !== "number" || isNaN(value)) {
        throw new Error(`Expected number, got ${typeof value}`);
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        throw new Error(`Expected boolean, got ${typeof value}`);
      }
      break;

    case "json":
      if (!schema) {
        throw new Error("Schema is required for JSON type validation");
      }

      // Basic JSON validation - in a real implementation,
      // this would use ajv or similar for schema validation
      if (typeof value !== "object" && !Array.isArray(value)) {
        throw new Error(`Expected JSON object/array, got ${typeof value}`);
      }

      // TODO: Add schema validation here
      break;

    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

/**
 * Creates a default value for a given type
 */
export function getDefaultValue(type: string): any {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "json":
      return {};
    default:
      return null;
  }
}
