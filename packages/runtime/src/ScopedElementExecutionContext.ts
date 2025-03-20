import { BaseElement } from "@fireworks/shared";
import {
  ElementExecutionContext,
  ElementExecutionContextSerialized,
} from "@fireworks/types";
import type { DataElementMetadata } from "@fireworks/types";
import {
  createScopedDataModel,
  isVariableAccessible,
} from "@fireworks/elements";

/**
 * Interface for a scoped data model that provides access to variables
 * based on the element hierarchy
 */
interface ScopedDataModel {
  get(key: string): any | undefined;
  has(key: string): boolean;
  getMetadata(key: string): DataElementMetadata | undefined;
  getAllMetadata(): Record<string, DataElementMetadata>;
  set(key: string, value: any, validate?: boolean): boolean;
  setValue(key: string, value: any, metadata: DataElementMetadata): boolean;
  getLocalVariables(): Record<string, any>;
  getAllVariables(): Record<string, any>;
  getElementId(): string;
  getParentScope(): ScopedDataModel | undefined;
}

// Map to store scoped data models by context ID
const scopedDataModelMap = new WeakMap<
  ElementExecutionContext,
  ScopedDataModel
>();

/**
 * Creates a scoped execution context for an element
 */
export function createScopedExecutionContext<
  PropValues = any,
  InputValue = any,
>(
  element: BaseElement,
  baseContext: Omit<ElementExecutionContext, "datamodel">,
  parentContext?: ElementExecutionContext
): ElementExecutionContext<PropValues, InputValue> {
  // Extract the datamodel from the parent context if available
  const parentDataModel = parentContext
    ? getScopedDataModelForContext(parentContext)
    : undefined;

  // Create a scoped data model for this element
  const dataModel = createScopedDataModel(
    element.id,
    element.dataModel || {},
    element.dataModel?.__metadata || {},
    parentDataModel
  );

  // Create the execution context
  const context: ElementExecutionContext<PropValues, InputValue> = {
    ...baseContext,
    attributes: element.attributes as PropValues & { children?: any[] },
    datamodel: createDataModelProxy(dataModel, element.id),
  };

  // Store the scoped data model in the map, not directly in the context
  scopedDataModelMap.set(context, dataModel);

  return context;
}

/**
 * Gets the scoped data model for a context
 */
export function getScopedDataModelForContext(
  context: ElementExecutionContext
): ScopedDataModel | undefined {
  return scopedDataModelMap.get(context);
}

/**
 * Creates a proxy for the datamodel that enforces scoping rules
 */
function createDataModelProxy(
  scopedModel: ScopedDataModel,
  elementId: string
): Record<string, any> {
  return new Proxy(
    {},
    {
      get(target, prop) {
        const key = String(prop);

        // Special case for __metadata
        if (key === "__metadata") {
          return scopedModel.getAllMetadata();
        }

        // Check if the variable is accessible from this scope
        if (!isVariableAccessible(scopedModel, key, elementId)) {
          console.warn(
            `Variable ${key} is not accessible from element ${elementId}`
          );
          return undefined;
        }

        return scopedModel.get(key);
      },

      set(target, prop, value) {
        const key = String(prop);

        // Don't allow setting __metadata directly
        if (key === "__metadata") {
          console.warn("Cannot set __metadata directly");
          return false;
        }

        try {
          // Check if the variable is readonly
          const metadata = scopedModel.getMetadata(key);
          if (metadata?.readonly) {
            throw new Error(`Cannot assign to readonly variable: ${key}`);
          }

          return scopedModel.set(key, value);
        } catch (error) {
          console.error(`Error setting ${key}:`, error);
          throw error; // Re-throw to allow proper error handling
        }
      },

      has(target, prop) {
        const key = String(prop);
        return (
          scopedModel.has(key) &&
          isVariableAccessible(scopedModel, key, elementId)
        );
      },

      ownKeys() {
        // Return all accessible variables
        const allVars = scopedModel.getAllVariables();
        return Object.keys(allVars).filter((key) =>
          isVariableAccessible(scopedModel, key, elementId)
        );
      },

      getOwnPropertyDescriptor(target, prop) {
        const key = String(prop);
        if (
          scopedModel.has(key) &&
          isVariableAccessible(scopedModel, key, elementId)
        ) {
          return {
            value: scopedModel.get(key),
            writable: !scopedModel.getMetadata(key)?.readonly,
            enumerable: true,
            configurable: true,
          };
        }
        return undefined;
      },
    }
  );
}

/**
 * Serializes a scoped execution context
 */
export function serializeScopedExecutionContext(
  context: ElementExecutionContext
): ElementExecutionContextSerialized {
  // Extract the scoped data model
  const scopedModel = getScopedDataModelForContext(context);

  // Create a serialized version with just the accessible variables
  return {
    ...context,
    datamodel: scopedModel ? scopedModel.getAllVariables() : context.datamodel,
  };
}
