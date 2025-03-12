/**
 * Graph Builder Module
 *
 * This module is responsible for constructing the execution graph from elements.
 * It separates the graph construction logic from the element definition and execution.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ExecutionGraphElement,
  ElementType,
  ElementRole,
} from "@fireworks/types";
import { BaseElement } from "@fireworks/shared";
import { container, ServiceIdentifiers } from "./di";

/**
 * Context for building execution graph elements
 */
export interface BuildContext {
  workflow: BaseElement;
  readonly elementKey: string;
  children: BaseElement[];
  readonly attributes: Record<string, any>;
  readonly conditions: any;
  readonly spec: any;
  getElementByKey(key: string, childOf?: BaseElement): BaseElement | null;
  getCachedGraphElement(elementId: string): ExecutionGraphElement | undefined;
  setCachedGraphElement(
    elementId: string | string[],
    ege: ExecutionGraphElement
  ): void;
  createNewContextForChild(child: BaseElement): BuildContext;
}

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
    const context: BuildContext = {
      workflow: parent?.workflow || element,
      elementKey: element.key,
      children: element.children as BaseElement[],
      attributes: element.attributes,
      conditions: element.conditions,
      spec: element,
      getElementByKey: (key: string, childOf?: BaseElement) => {
        if (element.key === key) {
          return element;
        }

        const searchIn = childOf ? childOf.children : element.children;
        for (const child of searchIn) {
          if ((child as BaseElement).key === key) {
            return child as BaseElement;
          }
          const found = this.findElementByKey(child as BaseElement, key);
          if (found) {
            return found;
          }
        }
        return null;
      },
      getCachedGraphElement: (elementId: string) => {
        return this.graphElementCache.get(elementId);
      },
      setCachedGraphElement: (
        elementId: string | string[],
        ege: ExecutionGraphElement
      ) => {
        const ids = Array.isArray(elementId) ? elementId : [elementId];
        for (const id of ids) {
          if (id) {
            this.graphElementCache.set(id, ege);
          }
        }
      },
      createNewContextForChild: (child: BaseElement) => {
        return this.createBuildContext(child, context);
      },
    };

    return context;
  }

  /**
   * Find an element by key
   * @param element The element to search in
   * @param key The key to search for
   * @returns The element with the key, or null if not found
   */
  private findElementByKey(
    element: BaseElement,
    key: string
  ): BaseElement | null {
    if (element.key === key) {
      return element;
    }

    for (const child of element.children) {
      const found = this.findElementByKey(child as BaseElement, key);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Create a default execution graph element
   * @param tag The element tag
   * @param role The element role
   * @param attributes The element attributes
   * @param key The element key
   * @returns The execution graph element
   */
  createDefaultExecutionGraphElement(
    tag: ElementType,
    role: ElementRole,
    attributes: Record<string, any>,
    key: string
  ): ExecutionGraphElement {
    return {
      id: attributes.id || `${tag}_${uuidv4()}`,
      type: role,
      key,
      subType: tag,
      attributes,
      next: [],
      parallel: [],
      runAfter: [],
    };
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
