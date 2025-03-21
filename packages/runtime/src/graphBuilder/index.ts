/**
 * Graph Builder Module
 *
 * This module is responsible for constructing the execution graph from elements.
 * It separates the graph construction logic from the element definition and execution.
 */

import { BaseElement } from "../elements/BaseElement";
import { container, ServiceIdentifiers } from "../di";
import { BuildContext } from "./Context";
import type { ExecutionGraphElement } from "../types";

/**
 * Graph builder service
 */
export class GraphBuilder {
  private graphElementCache: Map<string, ExecutionGraphElement> = new Map();

  /**
   * Build an execution graph from a root element
   * @param rootElement The root element
   * @returns The execution graph
   */
  buildGraph(rootElement: BaseElement): ExecutionGraphElement {
    // Clear the cache
    this.graphElementCache.clear();

    // Create a build context for the root element
    const context = this.createBuildContext(rootElement);

    // Build the graph
    return rootElement.onExecutionGraphConstruction(context);
  }

  /**
   * Create a build context for an element
   * @param element The element
   * @param parent The parent context (optional)
   * @returns The build context
   */
  private createBuildContext(
    element: BaseElement,
    parent?: BuildContext
  ): BuildContext {
    const context = new BuildContext(
      parent?.workflow!,
      element.key,
      element.children as BaseElement[],
      element.attributes,
      element.conditions ?? {},
      element,
      element,
      this.graphElementCache
    );

    return context;
  }
}

/**
 * Register the graph builder service
 */
export function registerGraphBuilder(): void {
  container.register(ServiceIdentifiers.GRAPH_BUILDER, new GraphBuilder());
}

/**
 * Get the graph builder service
 * @returns The graph builder service
 */
export function getGraphBuilder(): GraphBuilder {
  return container.get<GraphBuilder>(ServiceIdentifiers.GRAPH_BUILDER);
}
