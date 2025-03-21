import { registerGraphBuilder } from "./graphBuilder";
import { registerExecutionContextFactory } from "./ElementExecutionContext";
/**
 * Dependency Injection Module
 *
 * This module provides a simple dependency injection container for the runtime.
 * It allows for decoupling of components and easier testing.
 */

/**
 * A simple dependency injection container
 */
export class Container {
  private services: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();

  /**
   * Register a service instance
   * @param name The name of the service
   * @param instance The service instance
   */
  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  /**
   * Register a factory function that creates a service instance
   * @param name The name of the service
   * @param factory A factory function that creates the service instance
   */
  registerFactory<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  /**
   * Get a service instance
   * @param name The name of the service
   * @returns The service instance
   */
  get<T>(name: string): T {
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    if (this.factories.has(name)) {
      const factory = this.factories.get(name)!;
      const instance = factory();
      this.services.set(name, instance);
      return instance as T;
    }

    throw new Error(`Service not found: ${name}`);
  }

  /**
   * Check if a service is registered
   * @param name The name of the service
   * @returns True if the service is registered
   */
  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Remove a service
   * @param name The name of the service
   */
  remove(name: string): void {
    this.services.delete(name);
    this.factories.delete(name);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

/**
 * The global container instance
 */
export const container = new Container();

/**
 * Service identifiers
 */
export const ServiceIdentifiers = {
  GRAPH_BUILDER: "graphBuilder",
  ELEMENT_FACTORY: "elementFactory",
  EXECUTION_CONTEXT: "executionContext",
  WORKFLOW_RUNNER: "workflowRunner",
};

/**
 * A decorator for injecting dependencies
 * @param serviceId The service identifier
 * @returns A property decorator
 */
export function inject(serviceId: string) {
  return function (target: any, propertyKey: string) {
    const getter = function () {
      return container.get(serviceId);
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * Initialize all runtime services
 * This ensures all required dependencies are registered before they're used
 */
export function initializeRuntime(): void {
  // Register the graph builder service
  if (!container.has(ServiceIdentifiers.GRAPH_BUILDER)) {
    registerGraphBuilder();
  }

  // Register the execution context factory
  if (!container.has(ServiceIdentifiers.EXECUTION_CONTEXT)) {
    registerExecutionContextFactory();
  }

  // Add any other service registrations here
}
