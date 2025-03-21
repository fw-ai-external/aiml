import { z } from "zod";

// Define field types
type FieldType = "string" | "number" | "boolean" | "json";

// Field definition interface
interface FieldDefinition {
  type: FieldType;
  readonly: boolean;
  fromRequest: boolean;
  defaultValue: any;
  schema: z.ZodType<any>;
}

// Data model interface - collection of fields
interface DataModel {
  [fieldName: string]: FieldDefinition;
}

// Storage for field values
interface FieldValues {
  [fieldName: string]: any;
}

/**
 * Context class that provides scoped access to data values
 */
export class Context {
  private dataModels: Map<string, DataModel> = new Map();
  private fieldValues: Map<string, FieldValues> = new Map();

  /**
   * Add a data model to a specific scope
   * @param scope Dot-notated scope key
   * @param dataModel Object containing field definitions
   */
  public addDataModel(scope: string, dataModel: DataModel): void {
    this.dataModels.set(scope, dataModel);

    // Initialize field values with default values
    const values: FieldValues = {};
    for (const [fieldName, fieldDef] of Object.entries(dataModel)) {
      values[fieldName] = fieldDef.defaultValue;
    }
    this.fieldValues.set(scope, values);
  }

  /**
   * Get a scoped data model for accessing and modifying values
   * @param scope Dot-notated scope key
   */
  public getScopedDataModel(scope: string): ScopedDataModel {
    return new ScopedDataModel(this, scope);
  }

  /**
   * Get all parent scopes that apply to the given scope
   * @param scope Dot-notated scope key
   * @returns Array of parent scopes, ordered from most to least specific
   */
  private getParentScopes(scope: string): string[] {
    const relevantScopes: string[] = [];

    // Find all registered scopes that are prefixes of the requested scope
    for (const [registeredScope] of this.dataModels) {
      const registeredParts = registeredScope.split(".");
      const scopeParts = scope.split(".");

      let isPrefix = true;
      for (let i = 0; i < registeredParts.length; i++) {
        if (i >= scopeParts.length || scopeParts[i] !== registeredParts[i]) {
          isPrefix = false;
          break;
        }
      }

      if (isPrefix) {
        relevantScopes.push(registeredScope);
      }
    }

    // Sort by specificity (most specific first)
    return relevantScopes.sort((a, b) => b.length - a.length);
  }

  /**
   * Get all field definitions relevant to a scope
   * @param scope Dot-notated scope key
   */
  public getAllFieldDefinitions(scope: string): Map<string, FieldDefinition> {
    const result = new Map<string, FieldDefinition>();
    const parentScopes = this.getParentScopes(scope);

    // Process from least specific to most specific (most specific wins for conflicts)
    for (let i = parentScopes.length - 1; i >= 0; i--) {
      const parentScope = parentScopes[i];
      if (!parentScope) {
        continue;
      }
      const dataModel = this.dataModels.get(parentScope);

      if (dataModel) {
        for (const [fieldName, fieldDef] of Object.entries(dataModel)) {
          result.set(fieldName, fieldDef);
        }
      }
    }

    return result;
  }

  /**
   * Check if a field exists in any parent scope
   * @param scope Dot-notated scope key
   * @param fieldName Field name to check
   */
  public hasField(scope: string, fieldName: string): boolean {
    const parentScopes = this.getParentScopes(scope);

    for (const parentScope of parentScopes) {
      const dataModel = this.dataModels.get(parentScope);
      if (dataModel && fieldName in dataModel) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get a field value for a given scope
   * @param scope Dot-notated scope key
   * @param fieldName Field name to get
   */
  public getFieldValue(scope: string, fieldName: string): any {
    const parentScopes = this.getParentScopes(scope);

    // Check from most specific to least specific
    for (const parentScope of parentScopes) {
      const dataModel = this.dataModels.get(parentScope);
      const values = this.fieldValues.get(parentScope);

      if (dataModel && fieldName in dataModel && values) {
        return values[fieldName];
      }
    }

    return undefined;
  }

  /**
   * Find the scope that defines a particular field
   * @param scope Dot-notated scope key
   * @param fieldName Field name to look for
   */
  private getScopeForField(
    scope: string,
    fieldName: string
  ): string | undefined {
    const parentScopes = this.getParentScopes(scope);

    for (const parentScope of parentScopes) {
      const dataModel = this.dataModels.get(parentScope);
      if (dataModel && fieldName in dataModel) {
        return parentScope;
      }
    }

    return undefined;
  }

  /**
   * Set a field value, with validation
   * @param scope Dot-notated scope key
   * @param fieldName Field to set
   * @param value Value to set
   */
  public setFieldValue(scope: string, fieldName: string, value: any): void {
    const fieldScope = this.getScopeForField(scope, fieldName);

    if (!fieldScope) {
      throw new Error(`Field '${fieldName}' not found in any parent scope`);
    }

    const dataModel = this.dataModels.get(fieldScope);
    const values = this.fieldValues.get(fieldScope);

    if (!dataModel || !values) {
      throw new Error(
        `Data model or values not found for scope '${fieldScope}'`
      );
    }

    const fieldDef = dataModel[fieldName];

    if (!fieldDef) {
      throw new Error(`Field definition not found for field '${fieldName}'`);
    }

    // Check if readonly
    if (fieldDef.readonly) {
      throw new Error(`Field '${fieldName}' is readonly`);
    }

    // Validate with schema
    try {
      const validatedValue = fieldDef.schema.parse(value);
      values[fieldName] = validatedValue;
    } catch (error) {
      throw new Error(`Validation failed for field '${fieldName}': ${error}`);
    }
  }
}

/**
 * Provides scoped access to data fields
 */
export class ScopedDataModel {
  private context: Context;
  private scope: string;

  constructor(context: Context, scope: string) {
    this.context = context;
    this.scope = scope;
  }

  /**
   * Check if a field exists in this scope
   * @param fieldName Field name to check
   */
  public has(fieldName: string): boolean {
    return this.context.hasField(this.scope, fieldName);
  }

  /**
   * Get a field value
   * @param fieldName Field to get
   */
  public get(fieldName: string): any {
    return this.context.getFieldValue(this.scope, fieldName);
  }

  /**
   * Set a field value
   * @param fieldName Field to set
   * @param value Value to set
   */
  public set(fieldName: string, value: any): void {
    this.context.setFieldValue(this.scope, fieldName, value);
  }

  /**
   * Convert all accessible fields to a JSON object
   */
  public toJson(): Record<string, any> {
    const result: Record<string, any> = {};
    const fieldDefs = this.context.getAllFieldDefinitions(this.scope);

    // Get values for all accessible fields
    for (const [fieldName] of fieldDefs) {
      result[fieldName] = this.get(fieldName);
    }

    return result;
  }
}
