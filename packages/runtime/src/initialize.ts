/**
 * Runtime Initialization Module
 *
 * This module initializes all required services for the runtime.
 * It should be imported early in the application startup process.
 */

import { registerGraphBuilder } from "./graph-builder";
import { registerExecutionContextFactory } from "./execution-context";
import { container, ServiceIdentifiers } from "./di";

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

// Auto-initialize when this module is imported
initializeRuntime();
