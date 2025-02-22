import { BaseElement } from "./BaseElement";
import { ExecutionGraphElement } from "./types";

export class BuildContext {
  private readonly elementCache = new Map<string, ExecutionGraphElement>();
  private readonly elementKeyCache = new Map<string, ExecutionGraphElement>();
  private readonly elementIdCache = new Map<string, ExecutionGraphElement>();

  constructor(
    public readonly attributes: Record<string, any>,
    public readonly elementKey: string,
    public readonly parents: BaseElement[] = []
  ) {}

  public getCachedGraphElement(key: string): ExecutionGraphElement | undefined {
    return (
      this.elementCache.get(key) ||
      this.elementKeyCache.get(key) ||
      this.elementIdCache.get(key)
    );
  }

  public setCachedGraphElement(keys: string[], element: ExecutionGraphElement) {
    keys.forEach((key) => {
      this.elementCache.set(key, element);
      this.elementKeyCache.set(key, element);
      this.elementIdCache.set(key, element);
    });
  }

  public findElementByKey(
    element: BaseElement,
    targetKey: string
  ): BaseElement | undefined {
    if (element.key === targetKey) {
      return element;
    }

    for (const child of element.children) {
      if (child instanceof BaseElement) {
        const found = this.findElementByKey(child, targetKey);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  public buildExecutionGraph(
    element: BaseElement,
    children: BaseElement[]
  ): ExecutionGraphElement {
    if (element.onExecutionGraphConstruction) {
      return element.onExecutionGraphConstruction(this);
    }

    throw new Error(
      `Element ${element.tag} does not have an execution graph construction method`
    );
  }
}
