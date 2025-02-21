import { Node, BaseElement, ElementPredicate } from "./BaseElement";

export interface RenderContext {
  render: (
    node: Node,
    options: {
      stop: ElementPredicate;
      map: (frame: Node) => string;
    }
  ) => AsyncGenerator<Node, Node, unknown>;
  memo: (node: Node) => Node;
}

export function createRenderContext(): RenderContext {
  const memoizedNodes = new Map<string, Node>();

  return {
    memo(node: Node): Node {
      if (!node) return "";
      const key = isBaseElement(node) ? node.id : String(node);
      if (!memoizedNodes.has(key)) {
        memoizedNodes.set(key, node);
      }
      return memoizedNodes.get(key) ?? node;
    },

    async *render(
      node: Node,
      options: {
        stop: ElementPredicate;
        map: (frame: Node) => string;
      }
    ): AsyncGenerator<Node, Node, unknown> {
      const { stop, map } = options;

      // Convert node to string representation
      const stringifyNode = (n: Node): string => {
        if (!n) return "";
        if (typeof n === "string") return n;
        if (typeof n === "number" || typeof n === "boolean") return String(n);
        if (Array.isArray(n)) return n.map(stringifyNode).join("");
        if (isBaseElement(n)) {
          const attrs = Object.entries(n.attributes || {})
            .map(([key, value]) => ` ${key}="${value}"`)
            .join("");
          const children = Array.isArray(n.children)
            ? n.children.map(stringifyNode).join("")
            : stringifyNode(n.children);
          return `<${n.tag}${attrs}>${children}</${n.tag}>`;
        }
        return "";
      };

      // If stop is provided and returns true, stop traversal
      if (stop(node)) {
        map(stringifyNode(node));
        return node;
      }

      // Process node
      map(stringifyNode(node));
      yield node;
      return node;
    },
  };
}

function isBaseElement(value: unknown): value is BaseElement {
  return value !== null && typeof value === "object" && "tag" in value;
}
