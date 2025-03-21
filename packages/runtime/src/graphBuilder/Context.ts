import type { Workflow } from "@mastra/core/workflows";
import { BaseElement } from "../elements/BaseElement";
import type { ExecutionGraphElement } from "../types";

// Define missing types
export interface StepConfig<
  TInput = any,
  TOutput = any,
  TProps = any,
  TContext = any,
> {
  when?: (context: TContext) => Promise<boolean>;
}

export class BuildContext {
  /**
   * A cache of already-constructed ExecutionGraphElements,
   * keyed by their SCXML element's 'id'.
   */
  public children: BaseElement[];
  constructor(
    public workflow: Workflow,
    public readonly elementKey: string,
    children: BaseElement[],
    public readonly attributes: Record<string, any> = {},
    public readonly conditions: StepConfig<any, any, any, any>,
    public readonly spec: BaseElement,
    public readonly fullSpec: BaseElement | null,
    public graphCache = new Map<string, ExecutionGraphElement>()
  ) {
    this.children = children;
  }

  public findElementByKey(
    targetKey: string,
    withinNode?: BaseElement
  ): BaseElement | undefined {
    if ((withinNode ?? this.spec).key === targetKey) {
      return withinNode;
    }

    for (const child of (withinNode ?? this.fullSpec ?? this.spec).children) {
      const found = this.findElementByKey(targetKey, child);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  /**
   * Check if we have a cached ExecutionGraphElement for `elementId`.
   * If found, return it. If not found, returns undefined.
   */
  public getCachedGraphElement(
    elementId: string
  ): ExecutionGraphElement | undefined {
    console.log("elementId", elementId);
    if (
      this.graphCache.has(elementId) ||
      elementId === this.elementKey ||
      elementId === this.attributes.id
    ) {
      return this.graphCache.get(elementId);
    }
    const found = this.findElementByKey(elementId);
    console.log("found", found?.key);
    if (found) {
      return found.onExecutionGraphConstruction(
        this.createNewContextForChild(found)
      );
    }
    return undefined;
  }

  /**
   * Store a newly built ExecutionGraphElement in the cache,
   * keyed by the elementId (unique SCXML ID).
   */
  public setCachedGraphElement(
    elementId: string | string[],
    ege: ExecutionGraphElement
  ): void {
    if (Array.isArray(elementId)) {
      elementId.forEach((id) => this.graphCache.set(id, ege));
    } else {
      this.graphCache.set(elementId, ege);
    }
  }

  public createNewContextForChild(child: BaseElement): BuildContext {
    if ((child as BaseElement).onExecutionGraphConstruction) {
      return new BuildContext(
        this.workflow,
        child.key,
        child.children,
        child.attributes,
        this.conditions,
        child,
        this.fullSpec,
        this.graphCache
      );
    }
    throw new Error(
      "Child passed to createNewContextForChild is not a BaseElement"
    );
  }
}
