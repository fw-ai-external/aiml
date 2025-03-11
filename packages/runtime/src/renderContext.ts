import { BaseElement } from "@fireworks/shared";

function stringifyNode(node: BaseElement): string {
  if (!node) return "";
  if (node.attributes.text) {
    return String(node.attributes.text);
  }
  return node.children
    .filter((child: any): child is BaseElement => child instanceof BaseElement)
    .map(stringifyNode)
    .join("");
}

export interface IRenderContext {
  readonly attributes: Record<string, any>;
  readonly children: BaseElement[];
  toString(): string;
}

export class RenderContext implements IRenderContext {
  private readonly memoizedNodes = new Map<string, string>();

  constructor(
    public readonly attributes: Record<string, any>,
    public readonly children: BaseElement[]
  ) {}

  public toString(): string {
    return this.children
      .filter(
        (child: any): child is BaseElement => child instanceof BaseElement
      )
      .map((node) => {
        const key = node.id;
        if (this.memoizedNodes.has(key)) {
          return this.memoizedNodes.get(key)!;
        }
        const result = stringifyNode(node);
        this.memoizedNodes.set(key, result);
        return result;
      })
      .join("");
  }
}
