import type {
  DataModel,
  FieldDefinition,
  FieldValues,
} from "@fireworks/shared";
import { JSONSchemaToZod } from "@dmitryrechkin/json-schema-to-zod";

/**
 * Context class that provides scoped access to data values
 */
export class DataModelRegistry {
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
   * Add multiple data models to multiple scopes in one call
   * @param models Record of scope keys to data models
   */
  public addDataModels(models: Record<string, DataModel>): void {
    for (const [scope, dataModel] of Object.entries(models)) {
      this.addDataModel(scope, dataModel);
    }
  }

  /**
   * Rehydrate from a dump while skipping fromRequest fields
   * @param data Output from dump()
   */
  static rehydrateFromDump(data: {
    scopedDataModels: Record<string, DataModel>;
    fieldValues: Record<string, FieldValues>;
  }): DataModelRegistry {
    const registry = new DataModelRegistry();

    // Clear existing state
    registry.dataModels.clear();
    registry.fieldValues.clear();

    // Restore data models
    for (const [scope, model] of Object.entries(data.scopedDataModels)) {
      registry.dataModels.set(scope, { ...model });
    }

    // Restore field values (excluding fromRequest fields)
    for (const [scope, values] of Object.entries(data.fieldValues)) {
      const dataModel = registry.dataModels.get(scope);
      if (!dataModel) continue;

      const currentValues: FieldValues = {};

      for (const [fieldName, value] of Object.entries(values)) {
        const fieldDef = dataModel[fieldName];
        if (!fieldDef || fieldDef.fromRequest) continue;

        try {
          const validator = JSONSchemaToZod.convert(fieldDef.schema);
          const validatedValue = validator.parse(value);
          currentValues[fieldName] = validatedValue;
        } catch (error) {
          console.warn(
            `Validation failed during rehydration for ${scope}.${fieldName}:`,
            error
          );
        }
      }

      registry.fieldValues.set(scope, currentValues);
    }

    return registry;
  }

  /**
   * Convert the entire registry state to JSON including schemas, configs and values
   */
  public toJSON(): {
    scopedDataModels: Record<string, DataModel>;
    fieldValues: Record<string, FieldValues>;
  } {
    const scopedDataModels: Record<string, DataModel> = {};
    const fieldValues: Record<string, FieldValues> = {};

    // Convert dataModels Map to plain object
    for (const [scope, model] of this.dataModels.entries()) {
      scopedDataModels[scope] = { ...model };
    }

    // Convert fieldValues Map to plain object
    for (const [scope, values] of this.fieldValues.entries()) {
      fieldValues[scope] = { ...values };
    }

    return { scopedDataModels, fieldValues };
  }

  /**
   * Get a scoped data model for accessing and modifying values
   * @param scope Dot-notated scope key
   */
  public getScopedDataModel(scope: string): ScopedDataModelRegistry {
    return new ScopedDataModelRegistry(this, scope);
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

    // Sort by specificity (most specific first) based on depth, then length
    return relevantScopes.sort((a, b) => {
      const aDepth = a.split(".").length;
      const bDepth = b.split(".").length;
      return bDepth - aDepth || b.length - a.length;
    });
  }

  public getAllScopes() {
    return Array.from(this.dataModels.keys());
  }

  /**
   * Get all field definitions relevant to a scope
   * @param scope Dot-notated scope key
   */
  public getAllFieldDefinitions(scope?: string): Map<string, FieldDefinition> {
    const result = new Map<string, FieldDefinition>();
    const parentScopes = scope
      ? this.getParentScopes(scope)
      : this.getAllScopes();

    // Process from most specific to least specific (first definition wins)
    for (const parentScope of parentScopes) {
      if (!parentScope) continue;

      const dataModel = this.dataModels.get(parentScope);
      if (!dataModel) continue;

      for (const [fieldName, fieldDef] of Object.entries(dataModel)) {
        if (!result.has(fieldName)) {
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
      const validator = JSONSchemaToZod.convert(fieldDef.schema);
      const validatedValue = validator.parse(value);
      values[fieldName] = validatedValue;
    } catch (error) {
      throw new Error(`Validation failed for field '${fieldName}': ${error}`);
    }
  }
}

/**
 * Provides scoped access to data fields
 */
export class ScopedDataModelRegistry {
  private registry: DataModelRegistry;
  private scope: string;

  constructor(registry: DataModelRegistry, scope: string) {
    this.registry = registry;
    this.scope = scope;
  }

  /**
   * Check if a field exists in this scope
   * @param fieldName Field name to check
   */
  public has(fieldName: string): boolean {
    return this.registry.hasField(this.scope, fieldName);
  }

  /**
   * Get a field value
   * @param fieldName Field to get
   */
  public get(fieldName: string): any {
    return this.registry.getFieldValue(this.scope, fieldName);
  }

  /**
   * Set a field value
   * @param fieldName Field to set
   * @param value Value to set
   */
  public set(fieldName: string, value: any): void {
    this.registry.setFieldValue(this.scope, fieldName, value);
  }

  /**
   * Convert all accessible fields to a JSON object
   */
  public toJSON(): Record<string, any> {
    const result: Record<string, any> = {};
    const fieldDefs = this.registry.getAllFieldDefinitions(this.scope);

    // Get values for all accessible fields
    for (const [fieldName] of fieldDefs) {
      result[fieldName] = this.get(fieldName);
    }

    return result;
  }
}
