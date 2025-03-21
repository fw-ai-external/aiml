import type { DataElementMetadata } from './values/data-types';
export type { DataElementMetadata };

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
