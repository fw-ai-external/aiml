import { ExecutionGraphElement } from "./types";
import { Workflow } from "@mastra/core/workflows";
import { BaseElement } from "../element/BaseElement";
import { BuildContext as BuildContextInterface } from "@fireworks/types";
// Define missing types
export interface StepConfig<
  TInput = any,
  TOutput = any,
  TProps = any,
  TContext = any,
> {
  when?: (context: TContext) => Promise<boolean>;
}

export class BuildContext implements BuildContextInterface {
  /**
   * A cache of already-constructed ExecutionGraphElements,
   * keyed by their SCXML element's 'id'.
   */
  public graphCache = new Map<string, ExecutionGraphElement>();
  public children: BaseElement[];
  constructor(
    public workflow: Workflow,
    public readonly elementKey: string,
    children: BaseElement[],
    public readonly attributes: Record<string, any> = {},
    public readonly conditions: StepConfig<any, any, any, any>,
    public readonly spec: BaseElement
  ) {
    this.children = children;
  }

  public findElementByKey(
    node: BaseElement,
    targetKey: string
  ): BaseElement | undefined {
    if (node instanceof BaseElement) {
      if (node.key === targetKey) {
        return node;
      }

      for (const child of node.children) {
        const found = this.findElementByKey(child, targetKey);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  public getElementByKey(
    key: string,
    childOf?: BaseElement
  ): BaseElement | null {
    const element = this.findElementByKey(childOf ?? this.spec, key);
    if (!element) {
      return null;
    }
    return element;
  }

  /**
   * Check if we have a cached ExecutionGraphElement for `elementId`.
   * If found, return it. If not found, returns undefined.
   */
  public getCachedGraphElement(
    elementId: string
  ): ExecutionGraphElement | undefined {
    return this.graphCache.get(elementId);
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

  public createNewContextForChild(child: BaseElement): BuildContextInterface {
    if (child instanceof BaseElement) {
      return new BuildContext(
        this.workflow,
        child.key,
        child.children,
        child.attributes,
        this.conditions,
        child
      ) as any as BuildContextInterface;
    }
    throw new Error(
      "Child passed to createNewContextForChild is not a BaseElement"
    );
  }
}
