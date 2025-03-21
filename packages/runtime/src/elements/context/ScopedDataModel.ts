import type { DataElementMetadata } from '@fireworks/shared';

/**
 * Interface for a scoped data model that provides access to variables
 * based on the element hierarchy
 */
export interface ScopedDataModel {
  /**
   * Get a variable value by name, respecting scope
   * @param key The variable name
   * @returns The variable value or undefined if not found
   */
  get(key: string): any | undefined;

  /**
   * Check if a variable exists in the current scope or any parent scope
   * @param key The variable name
   * @returns True if the variable exists, false otherwise
   */
  has(key: string): boolean;

  /**
   * Get metadata for a variable
   * @param key The variable name
   * @returns The variable metadata or undefined if not found
   */
  getMetadata(key: string): DataElementMetadata | undefined;

  /**
   * Get all metadata from the current scope and parent scopes
   * @returns A record of all metadata
   */
  getAllMetadata(): Record<string, DataElementMetadata>;

  /**
   * Set a variable value
   * @param key The variable name
   * @param value The new value
   * @param validate Whether to validate the assignment (check readonly, etc.)
   * @returns True if the assignment was successful, false otherwise
   * @throws Error if validation fails
   */
  set(key: string, value: any, validate?: boolean): boolean;

  /**
   * Set a variable value with metadata
   * @param key The variable name
   * @param value The new value
   * @param metadata The metadata for the variable
   * @returns True if the assignment was successful, false otherwise
   */
  setValue(key: string, value: any, metadata: DataElementMetadata): boolean;

  /**
   * Get all variables in the current scope
   * @returns A record of all variables in the current scope
   */
  getLocalVariables(): Record<string, any>;

  /**
   * Get all variables accessible from the current scope (including parent scopes)
   * @returns A record of all accessible variables
   */
  getAllVariables(): Record<string, any>;

  /**
   * Get the element ID that owns this scope
   * @returns The element ID
   */
  getElementId(): string;

  /**
   * Get the parent scope
   * @returns The parent scope or undefined if this is the root scope
   */
  getParentScope(): ScopedDataModel | undefined;
}

/**
 * Create a scoped data model for an element
 * @param elementId The element ID
 * @param variables The local variables for this scope
 * @param metadata The metadata for the variables
 * @param parentScope The parent scope
 * @returns A new scoped data model
 */
export function createScopedDataModel(
  elementId: string,
  variables: Record<string, any> = {},
  metadata: Record<string, DataElementMetadata> = {},
  parentScope?: ScopedDataModel,
): ScopedDataModel {
  // Create a local copy of the variables and metadata
  const localVariables = { ...variables };
  const localMetadata = { ...metadata };

  return {
    get(key: string): any | undefined {
      // Special case for metadata
      if (key === '__metadata') {
        return this.getAllMetadata();
      }

      // Check local scope first
      if (key in localVariables) {
        return localVariables[key];
      }

      // Then check parent scope
      return parentScope?.get(key);
    },

    has(key: string): boolean {
      return key in localVariables || (parentScope?.has(key) ?? false);
    },

    getMetadata(key: string): DataElementMetadata | undefined {
      // Check local scope first
      if (key in localMetadata) {
        return localMetadata[key];
      }

      // Then check parent scope
      return parentScope?.getMetadata(key);
    },

    set(key: string, value: any, validate: boolean = true): boolean {
      // If the variable exists in the local scope, update it
      if (key in localVariables) {
        // Check if the variable is readonly
        if (validate && localMetadata[key]?.readonly) {
          throw new Error(`Cannot assign to readonly variable: ${key}`);
        }

        localVariables[key] = value;
        return true;
      }

      // If the variable exists in a parent scope, update it there
      if (parentScope?.has(key)) {
        return parentScope.set(key, value, validate);
      }

      // If the variable doesn't exist anywhere, create it in the local scope
      localVariables[key] = value;
      return true;
    },

    getLocalVariables(): Record<string, any> {
      return { ...localVariables };
    },

    getAllVariables(): Record<string, any> {
      const allVariables = parentScope ? parentScope.getAllVariables() : {};

      // Local variables override parent variables
      return {
        ...allVariables,
        ...localVariables,
      };
    },

    getAllMetadata(): Record<string, DataElementMetadata> {
      const allMetadata = parentScope
        ? (parentScope.get('__metadata') as Record<string, DataElementMetadata>) || {}
        : {};

      // Local metadata overrides parent metadata
      return {
        ...allMetadata,
        ...localMetadata,
      };
    },

    getElementId(): string {
      return elementId;
    },

    getParentScope(): ScopedDataModel | undefined {
      return parentScope;
    },

    setValue(key: string, value: any, metadata: DataElementMetadata): boolean {
      // Store the value in the local scope
      localVariables[key] = value;

      // Store the metadata
      localMetadata[key] = metadata;

      return true;
    },
  };
}

/**
 * Check if a variable is accessible from the current scope
 * @param model The scoped data model
 * @param key The variable name
 * @param elementId The current element ID
 * @returns True if the variable is accessible, false otherwise
 */
export function isVariableAccessible(model: ScopedDataModel, key: string, elementId: string): boolean {
  // If the variable doesn't exist, it's not accessible
  if (!model.has(key)) {
    return false;
  }

  // Get the metadata for the variable
  const metadata = model.getMetadata(key);
  if (!metadata) {
    // If there's no metadata, assume it's accessible
    return true;
  }

  // If the variable is in the current element's scope, it's accessible
  if (metadata.id === elementId) {
    return true;
  }

  // If the variable is from a request, check if it's in the current scope or a parent scope
  if (metadata.fromRequest) {
    // Check if the current element is the same as the variable's parent state
    // or if the current element is a descendant of the variable's parent state
    let currentScope: ScopedDataModel | undefined = model;
    while (currentScope) {
      if (currentScope.getElementId() === metadata.parentStateId) {
        return true;
      }
      currentScope = currentScope.getParentScope();
    }
  }

  // For regular variables, they're accessible if they're in a parent scope
  return true;
}
