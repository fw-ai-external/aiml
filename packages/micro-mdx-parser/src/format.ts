import { ElementNode, Token, PositionRange, ImportNode } from "./types";

interface FormatOptions {
  voidTags: string[];
  closingTags: string[];
  childlessTags: string[];
  closingTagAncestorBreakers: Record<string, string[]>;
  includePositions: boolean;
}

const defaultPosition: PositionRange = {
  start: { index: 0, line: 1, column: 1 },
  end: { index: 0, line: 1, column: 1 },
};

function isMarkdownHeader(
  content: string
): { level: number; text: string } | null {
  const match = content.match(/^(#{1,6})\s+(.+)$/);
  if (match) {
    return {
      level: match[1].length,
      text: match[2].trim(),
    };
  }
  return null;
}

function isWhitespaceOnly(content: string): boolean {
  return /^\s*$/.test(content);
}

function mergeTextNodes(
  nodes: (Token | ElementNode)[],
  isContainer = false
): (Token | ElementNode)[] {
  if (!isContainer) {
    return nodes;
  }

  const result: (Token | ElementNode)[] = [];
  let textBeforeElement: Token | null = null;
  let textAfterElement: Token | null = null;
  let elementFound = false;

  for (const node of nodes) {
    if (node.type === "text") {
      if (!elementFound) {
        if (!isWhitespaceOnly(node.content)) {
          if (textBeforeElement) {
            textBeforeElement.content += node.content;
            textBeforeElement.position!.end = node.position!.end;
          } else {
            textBeforeElement = { ...node };
          }
        }
      } else {
        if (!isWhitespaceOnly(node.content)) {
          if (textAfterElement) {
            textAfterElement.content += node.content;
            textAfterElement.position!.end = node.position!.end;
          } else {
            textAfterElement = { ...node };
          }
        }
      }
    } else {
      elementFound = true;
      if (textBeforeElement) {
        result.push(textBeforeElement);
        textBeforeElement = null;
      }
      result.push(node);
    }
  }

  if (textAfterElement) {
    result.push(textAfterElement);
  }

  return result;
}

function formatNode(
  node: ElementNode | Token,
  options: FormatOptions,
  source: string,
  isTopLevel = true
): ElementNode | Token {
  if (node.type === "text") {
    const header = isMarkdownHeader(node.content);
    if (header) {
      return {
        type: "element",
        tagName: `h${header.level}`,
        props: {},
        propsRaw: "",
        children: [
          {
            type: "text",
            content: header.text,
            position: node.position || defaultPosition,
          },
        ],
        position: node.position || defaultPosition,
      };
    }

    // Skip wrapping whitespace-only text in spans at the top level
    if (isTopLevel && isWhitespaceOnly(node.content)) {
      return node;
    }

    // Return text node as-is if it's inside a component
    if (!isTopLevel) {
      return node;
    }

    // Wrap in span only if it's at the root level and contains non-whitespace
    return {
      type: "element",
      tagName: "span",
      props: {},
      propsRaw: "",
      children: [node],
      position: node.position || defaultPosition,
    };
  }

  if (node.type === "comment" || node.type === "import") {
    return node;
  }

  const element = node as ElementNode;
  const children = element.children.map((child) =>
    formatNode(child, options, source, false)
  );

  return {
    ...element,
    type: "element",
    tagName: element.tagName,
    props: element.props || {},
    propsRaw: element.propsRaw || "",
    children,
    position: element.position,
    isSelfClosing: element.isSelfClosing,
  };
}

export function format(
  nodes: (Token | ElementNode)[],
  options: FormatOptions,
  source: string
): (ElementNode | ImportNode)[] {
  const formattedNodes = nodes
    .map((node) => formatNode(node, options, source))
    .filter((node) => node.type === "element" || node.type === "import");

  // Merge adjacent text nodes within each element and convert import tokens to nodes
  return formattedNodes.map((node) => {
    if (node.type === "import") {
      // Convert ImportToken to ImportNode
      const importToken = node as Token & { source: string; specifiers: any[] };
      return {
        type: "import",
        source: importToken.source,
        specifiers: importToken.specifiers,
        position: importToken.position || defaultPosition,
      };
    }

    const elementNode = node as ElementNode;
    const processedChildren: (Token | ElementNode)[] = [];
    let lastWasElement = false;

    // Process children to normalize whitespace
    elementNode.children.forEach((child, index) => {
      if (child.type === "text") {
        // Skip pure whitespace nodes at the start and end
        if (
          (index === 0 || index === elementNode.children.length - 1) &&
          isWhitespaceOnly(child.content)
        ) {
          return;
        }

        // For non-whitespace text nodes, add them directly
        if (!isWhitespaceOnly(child.content)) {
          processedChildren.push(child);
          lastWasElement = false;
          return;
        }

        // For whitespace between elements, add a single space
        if (lastWasElement && index < elementNode.children.length - 1) {
          const nextNonWhitespace = elementNode.children
            .slice(index + 1)
            .find((n) => !isWhitespaceOnly((n as Token).content || ""));
          if (nextNonWhitespace && nextNonWhitespace.type === "element") {
            processedChildren.push({ ...child, content: " " });
          }
        }
      } else {
        processedChildren.push(formatNode(child, options, source, false));
        lastWasElement = true;
      }
    });

    return {
      ...elementNode,
      children: processedChildren,
    };
  });
}
