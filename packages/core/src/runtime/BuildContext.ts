import { StepConfig, Workflow } from "@mastra/core/workflows";
import { BaseElement } from "../element/BaseElement";
import { FireAgentSpecNode } from "../element/types";
import { ExecutionGraphElement } from "./types";

export class BuildContext {
  /**
   * A cache of already-constructed ExecutionGraphElements,
   * keyed by their SCXML element's 'id'.
   */
  private graphCache = new Map<string, ExecutionGraphElement>();
  public children: FireAgentSpecNode[];
  constructor(
    public workflow: Workflow,
    children: FireAgentSpecNode[],
    public readonly attributes: Record<string, any>,
    public readonly conditions: StepConfig<any, any, any, any>,
    public readonly spec: FireAgentSpecNode
  ) {
    this.children = children;
  }

  public get thisElement() {
    return this.getElementById(this.attributes.id) as BaseElement;
  }

  private findElementById(
    node: FireAgentSpecNode,
    targetId: string
  ): BaseElement | undefined {
    if (node instanceof BaseElement) {
      if (node.id === targetId) {
        return node;
      }

      for (const child of node.getChildren) {
        const found = this.findElementById(child, targetId);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  public getElementById(id: string, childOf?: BaseElement): BaseElement | null {
    const element = this.findElementById(childOf ?? this.spec, id);
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
    elementId: string,
    ege: ExecutionGraphElement
  ): void {
    this.graphCache.set(elementId, ege);
  }

  public createNewContextForChild(child: FireAgentSpecNode): BuildContext {
    if (child instanceof BaseElement) {
      return new BuildContext(
        this.workflow,
        child.getChildren,
        child.attributes,
        this.conditions,
        child
      );
    }
    throw new Error(
      "Child passed to createNewContextForChild is not a BaseElement"
    );
  }
}
