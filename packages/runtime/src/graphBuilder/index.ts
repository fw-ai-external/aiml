/**
 * Graph Builder Module
 *
 * This module is responsible for constructing the execution graph from elements.
 * It separates the graph construction logic from the element definition and execution.
 */

import { ServiceIdentifiers, container } from "../di";
import type { BaseElement } from "../elements/BaseElement";
import type { ExecutionGraphElement } from "@fireworks/shared";
import { BuildContext } from "./Context";

// Default maximum recursion limit for any element
const DEFAULT_MAX_RECURSION = 10;

/**
 * Graph builder service
 */
export class GraphBuilder {
  private graphElementCache: Map<string, ExecutionGraphElement> = new Map();
  // Track recursion count for each element instead of just presence
  private currentConstructionPath: Map<string, number> = new Map();
  private _wasLoopDetected: boolean = false;
  private errorStateId: string = "error";

  /**
   * Build an execution graph from a root element
   * @param rootElement The root element
   * @returns The execution graph
   */
  buildGraph(rootElement: BaseElement): ExecutionGraphElement {
    // Clear the cache
    this.graphElementCache.clear();

    // Reset construction tracking
    this.resetConstructionTracking();

    // Create a build context for the root element
    const context = this.createBuildContext(rootElement);

    // Build the graph
    const graph = this.buildElementGraph(rootElement, context);

    // Ensure error state exists if needed
    this.ensureErrorStateExists(graph);

    return graph;
  }

  /**
   * Helper function to build the graph for a single element, utilizing the cache.
   * This will be called recursively.
   * @param element The element to build the graph for
   * @param context The current build context
   * @returns The execution graph element
   */
  buildElementGraph(
    element: BaseElement,
    context: BuildContext
  ): ExecutionGraphElement {
    // 1. Check cache
    const cachedGraph = this.getCachedGraphElement(element.key);
    if (cachedGraph) {
      return cachedGraph;
    }

    // 2. Check for recursion limit before proceeding
    const isRecursionLimitExceeded = this.beginElementConstruction(element);
    let graphElement: ExecutionGraphElement;

    try {
      if (isRecursionLimitExceeded) {
        // Recursion limit exceeded - create an error transition
        const parentElement = element["_parent"]?.deref(); // Access protected for context
        const sourceStepId = parentElement?.id || element.id;
        this.recordRecursionLimitExceeded(sourceStepId, element.key);

        graphElement = {
          id: element.id,
          key: element.key,
          type: "state", // Or appropriate default type
          tag: element.tag,
          attributes: element.attributes,
          scope: element.scope,
          // Point towards an error state when recursion limit is exceeded
          next: [this.getErrorStateElement(element.key)],
        };
        // Do not cache the element when recursion limit is exceeded
      } else {
        // Recursion limit not exceeded - proceed with normal graph construction
        graphElement = element.onExecutionGraphConstruction(context);

        // 3. Cache the result only if recursion limit was not exceeded
        this.setCachedGraphElement(element.key, graphElement);
      }
    } finally {
      // Finish construction tracking only if recursion limit was not exceeded
      if (!isRecursionLimitExceeded) {
        this.finishElementConstruction(element.key);
      }
    }

    return graphElement;
  }

  /**
   * Reset construction tracking
   */
  resetConstructionTracking(): void {
    this.currentConstructionPath.clear();
    this._wasLoopDetected = false;
  }

  /**
   * Begin element construction and check if recursion limit is exceeded
   * @param element The element
   * @returns true if recursion limit is exceeded, false otherwise
   */
  beginElementConstruction(element: BaseElement): boolean {
    const elementKey = element.key;
    const recursionCount = this.currentConstructionPath.get(elementKey) || 0;

    // Get max recursion limit from element attributes or use default
    let maxRecursion = DEFAULT_MAX_RECURSION;

    if (element.attributes && "maxRecursion" in element.attributes) {
      const attrValue = element.attributes.maxRecursion;
      if (typeof attrValue === "number") {
        maxRecursion = attrValue;
      } else if (typeof attrValue === "string") {
        const parsed = parseInt(attrValue, 10);
        if (!isNaN(parsed)) {
          maxRecursion = parsed;
        }
      }
    }

    // Check if recursion limit is exceeded
    if (recursionCount >= maxRecursion) {
      // Recursion limit exceeded
      this._wasLoopDetected = true;
      return true;
    }

    // Update recursion count and continue
    this.currentConstructionPath.set(elementKey, recursionCount + 1);
    return false;
  }

  /**
   * Finish element construction
   * @param elementKey The element key
   */
  finishElementConstruction(elementKey: string): void {
    const count = this.currentConstructionPath.get(elementKey);
    if (count && count > 1) {
      // Decrement the count
      this.currentConstructionPath.set(elementKey, count - 1);
    } else {
      // Remove from path if count is 1 or undefined
      this.currentConstructionPath.delete(elementKey);
    }
  }

  /**
   * Get a cached ExecutionGraphElement by its key.
   * @param elementKey The element key
   * @returns The cached ExecutionGraphElement or undefined
   */
  public getCachedGraphElement(
    elementKey: string
  ): ExecutionGraphElement | undefined {
    return this.graphElementCache.get(elementKey);
  }

  /**
   * Store a newly built ExecutionGraphElement in the cache.
   * @param elementKey The element key or keys
   * @param ege The ExecutionGraphElement to cache
   */
  public setCachedGraphElement(
    elementKey: string | string[],
    ege: ExecutionGraphElement
  ): void {
    if (Array.isArray(elementKey)) {
      elementKey.forEach((key) => this.graphElementCache.set(key, ege));
    } else {
      this.graphElementCache.set(elementKey, ege);
    }
  }

  /**
   * Check if an element key exists in the cache.
   * @param elementKey The element key
   * @returns True if the element is cached, false otherwise
   */
  public hasCachedGraphElement(elementKey: string): boolean {
    return this.graphElementCache.has(elementKey);
  }

  /**
   * Record when recursion limit is exceeded
   * @param sourceStepId The source step ID
   * @param loopedElementKey The element key that exceeded recursion limit
   */
  recordRecursionLimitExceeded(
    sourceStepId: string,
    loopedElementKey: string
  ): void {
    console.warn(
      `Recursion limit exceeded for element: ${loopedElementKey}. ` +
        `Creating transition from step '${sourceStepId}' to error state '${this.errorStateId}'.`
    );

    // We don't directly modify the graph here - we'll ensure the error state exists
    // and the transition will be created by the caller
  }

  /**
   * Returns a standard structure for the error state element.
   * @param sourceElementKey Optional key of the element causing the error state transition.
   */
  private getErrorStateElement(
    sourceElementKey?: string
  ): ExecutionGraphElement {
    return {
      id: this.errorStateId,
      key: this.errorStateId,
      type: "error",
      tag: "error",
      attributes: {
        id: this.errorStateId,
        message: `Workflow halted due to recursion limit exceeded${sourceElementKey ? ` for element ${sourceElementKey}` : ""}.`,
        ...(sourceElementKey && { sourceElement: sourceElementKey }),
      },
      scope: ["root", this.errorStateId],
    };
  }

  /**
   * Ensure error state exists in the graph
   * @param graph The graph to ensure the error state exists in
   */
  private ensureErrorStateExists(graph: ExecutionGraphElement): void {
    if (!this._wasLoopDetected) {
      return;
    }

    // Find if error state already exists
    const findErrorState = (node: ExecutionGraphElement): boolean => {
      if (node.id === this.errorStateId) {
        return true;
      }

      if (node.next) {
        for (const next of node.next) {
          if (findErrorState(next)) {
            return true;
          }
        }
      }

      if (node.parallel) {
        for (const parallel of node.parallel) {
          if (findErrorState(parallel)) {
            return true;
          }
        }
      }

      return false;
    };

    // If error state doesn't exist, add it to the graph
    if (!findErrorState(graph)) {
      const errorState: ExecutionGraphElement = {
        id: this.errorStateId,
        key: this.errorStateId,
        type: "error",
        tag: "error",
        attributes: {
          id: this.errorStateId,
          message: "Workflow halted due to recursion limit exceeded",
        },
        scope: ["root", this.errorStateId],
      };

      // Add to the root level next array
      if (!graph.next) {
        graph.next = [];
      }

      graph.next.push(errorState);
    }
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
      this
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
