import type {
  IBaseElement,
  TextNode,
  ExpressionNode,
  CommentNode,
  HeaderNode,
  AIMLNode,
} from "@fireworks/types";
import { BaseElement } from "./BaseElement";

export function astToRunnableBaseElementTree(nodes: AIMLNode[]): BaseElement {
  const headerNode = nodes.find((node) => node.type === "header") as
    | HeaderNode
    | undefined;
  let rootElement: BaseElement | undefined;
  let isAutoCreatedWorkflow = false;

  const rootElementNode = nodes.find(
    (node) => node.type === "element" && node.elementType === "workflow"
  ) as BaseElement | undefined;

  if (rootElementNode) {
    rootElement = rootElementNode;
  } else {
    isAutoCreatedWorkflow = true;
    rootElement = new BaseElement({
      id: "workflow-root",
      key: "workflow-root",
      tag: "workflow",
      role: "state",
      elementType: "workflow",
      attributes: {},
      children: [],
      allowedChildren: "any",
      schema: {} as any,
      type: "element",
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
    });
  }

  if (headerNode && headerNode.children) {
    for (const field of headerNode.children) {
      if (
        field.type === "headerField" &&
        field.id &&
        field.value !== undefined
      ) {
        rootElement.attributes[field.id] = field.value as string;
      }
    }
  }

  const comments: CommentNode[] = [];
  const processedNodes: IBaseElement[] = [];
  const rootLevelParagraphs: IBaseElement[] = [];

  for (const node of nodes) {
    if (node.type === "comment") {
      comments.push(node as CommentNode);
    } else if (node.type === "paragraph") {
      // Root level paragraphs get collected separately
      rootLevelParagraphs.push(convertParagraphToLlm(node));
    } else if (node.type === "element") {
      processedNodes.push(convertNodeToElement(node, comments));
    }
  }

  // Group root level paragraphs into state elements
  if (rootLevelParagraphs.length > 0) {
    // Create a state element for each paragraph
    const stateElements = rootLevelParagraphs.map((paragraph, index) =>
      createStateElement(`root-state-${index}`, [paragraph])
    );
    processedNodes.push(...stateElements);
  }

  for (const node of processedNodes) {
    if (node !== rootElement) {
      if (node.role === "action") {
        let hasStateAncestor = false;
        let currentParent = node.parent;

        while (currentParent) {
          if (currentParent.deref()?.role === "state") {
            hasStateAncestor = true;
            break;
          }
          currentParent = currentParent.deref()?.parent;
        }

        if (!hasStateAncestor && rootElement) {
          // Wrap action in a state if it doesn't have a state ancestor
          const stateElement = createStateElement(`state-${node.key}`, [node]);
          rootElement.children.push(stateElement);
        }
      } else if (rootElement && !node.parent) {
        rootElement.children.push(node);
      }
    }
  }

  if (comments.length > 0) {
    assignCommentsToElement(rootElement, comments);
  }

  const finalRootElement = ensureAllNodesAreElements(rootElement);

  // If this is an auto-created workflow, set the initial state to the first state element
  if (isAutoCreatedWorkflow && finalRootElement.children.length > 0) {
    const firstState = finalRootElement.children.find(
      (child) => child.role === "state"
    );
    if (firstState) {
      finalRootElement.attributes.initial = firstState.id;
    }
  }

  return finalRootElement;
}

function convertParagraphToLlm(paragraphNode: AIMLNode): IBaseElement {
  let promptText = "";
  if (paragraphNode.children) {
    for (const child of paragraphNode.children) {
      if (child.type === "text") {
        promptText += (child as TextNode).value;
      } else if (child.type === "expression") {
        promptText += `\${${(child as ExpressionNode).value}}`;
      }
    }
  }

  return new BaseElement({
    id: `llm-${paragraphNode.key}`,
    key: paragraphNode.key,
    tag: "llm",
    role: "action",
    elementType: "llm",
    attributes: {
      prompt: promptText,
    },
    children: [],
    allowedChildren: "none",
    schema: {} as any,
    type: "element",
    lineStart: paragraphNode.lineStart,
    lineEnd: paragraphNode.lineEnd,
    columnStart: paragraphNode.columnStart,
    columnEnd: paragraphNode.columnEnd,
  });
}

function convertNodeToElement(
  node: AIMLNode,
  comments: CommentNode[],
  parentNode?: IBaseElement
): IBaseElement {
  if (node.type === "element") {
    const elementNode = node as IBaseElement;
    const processedChildren: IBaseElement[] = [];

    if (elementNode.children) {
      for (const child of elementNode.children) {
        if (child.type === "element") {
          processedChildren.push(
            convertNodeToElement(child as AIMLNode, comments, elementNode)
          );
        } else if (child.type === "paragraph") {
          if (shouldConvertParagraphToLlm(child, elementNode)) {
            processedChildren.push(convertParagraphToLlm(child as AIMLNode));
          } else {
            processedChildren.push(convertParagraphToText(child as AIMLNode));
          }
        } else if (child.type === "comment") {
          comments.push(child as CommentNode);
        } else if (child.type === "text") {
          const textValue = (child as TextNode).value?.toString() || "";
          if (textValue.includes("{") && textValue.includes("}")) {
            processedChildren.push(
              new BaseElement({
                id: `script-${child.key}`,
                key: child.key,
                tag: "script",
                role: "action",
                elementType: "script",
                attributes: {
                  content: textValue,
                },
                children: [],
                allowedChildren: "none",
                schema: {} as any,
                type: "element",
                lineStart: child.lineStart,
                lineEnd: child.lineEnd,
                columnStart: child.columnStart,
                columnEnd: child.columnEnd,
              })
            );
          } else {
            processedChildren.push(
              new BaseElement({
                id: `text-${child.key}`,
                key: child.key,
                tag: "text",
                role: "output",
                elementType: "text" as any,
                attributes: {
                  content: textValue,
                },
                children: [],
                allowedChildren: "none",
                schema: {} as any,
                type: "element",
                lineStart: child.lineStart,
                lineEnd: child.lineEnd,
                columnStart: child.columnStart,
                columnEnd: child.columnEnd,
              })
            );
          }
        }
      }
    }

    return new BaseElement({
      id: elementNode.id || `element-${elementNode.key}`,
      key: elementNode.key,
      tag: elementNode.tag,
      role: elementNode.role,
      elementType: elementNode.elementType,
      attributes: elementNode.attributes || {},
      children: processedChildren,
      allowedChildren: elementNode.allowedChildren || "any",
      schema: {} as any,
      type: "element",
      lineStart: elementNode.lineStart,
      lineEnd: elementNode.lineEnd,
      columnStart: elementNode.columnStart,
      columnEnd: elementNode.columnEnd,
    });
  } else if (node.type === "paragraph") {
    if (shouldConvertParagraphToLlm(node, parentNode)) {
      return convertParagraphToLlm(node);
    }
    return convertParagraphToText(node);
  }

  return new BaseElement({
    id: `generic-${node.key}`,
    key: node.key,
    tag: "script",
    role: "action",
    elementType: "script",
    attributes: {
      content: node.value?.toString() || "",
    },
    children: [],
    allowedChildren: "none",
    schema: {} as any,
    type: "element",
    lineStart: node.lineStart,
    lineEnd: node.lineEnd,
    columnStart: node.columnStart,
    columnEnd: node.columnEnd,
  });
}

function assignCommentsToElement(
  element: BaseElement | IBaseElement | AIMLNode,
  remainingComments: CommentNode[]
): void {
  const elementComments: CommentNode[] = [];
  const otherComments: CommentNode[] = [];

  for (const comment of remainingComments) {
    if (comment.lineEnd <= element.lineStart) {
      elementComments.push(comment);
    } else {
      otherComments.push(comment);
    }
  }

  if (elementComments.length > 0) {
    (element as any).comments = elementComments;
  }

  if ("children" in element && element.children) {
    for (const child of element.children) {
      if (child.type === "element") {
        assignCommentsToElement(child, otherComments);
      }
    }
  }
}

function ensureAllNodesAreElements(element: IBaseElement): BaseElement {
  const processedChildren: IBaseElement[] = [];

  for (const child of element.children) {
    if (child.type === "element") {
      processedChildren.push(ensureAllNodesAreElements(child as IBaseElement));
    } else if (child.type === "paragraph") {
      processedChildren.push(convertParagraphToLlm(child as AIMLNode));
    } else if (child.type === "text") {
      processedChildren.push(
        new BaseElement({
          id: `text-${child.key}`,
          key: child.key,
          tag: "text",
          role: "output",
          elementType: "text" as any,
          attributes: {
            content: (child as TextNode).value?.toString() || "",
          },
          children: [],
          allowedChildren: "none",
          schema: {} as any,
          type: "element",
          lineStart: child.lineStart,
          lineEnd: child.lineEnd,
          columnStart: child.columnStart,
          columnEnd: child.columnEnd,
        })
      );
    } else {
      processedChildren.push(
        new BaseElement({
          id: `generic-${child.key}`,
          key: child.key,
          tag: "script",
          role: "action",
          elementType: "script",
          attributes: {
            content: child.value?.toString() || "",
          },
          children: [],
          allowedChildren: "none",
          schema: {} as any,
          type: "element",
          lineStart: child.lineStart,
          lineEnd: child.lineEnd,
          columnStart: child.columnStart,
          columnEnd: child.columnEnd,
        })
      );
    }
  }

  return new BaseElement({
    id: element.id,
    key: element.key,
    tag: element.tag,
    role: element.role,
    elementType: element.elementType,
    attributes: element.attributes,
    children: processedChildren,
    allowedChildren: element.allowedChildren,
    schema: {} as any,
    type: "element",
    lineStart: element.lineStart,
    lineEnd: element.lineEnd,
    columnStart: element.columnStart,
    columnEnd: element.columnEnd,
  });
}

function createStateElement(
  id: string,
  children: IBaseElement[]
): IBaseElement {
  return new BaseElement({
    id,
    key: id,
    tag: "state",
    role: "state",
    elementType: "state",
    attributes: {},
    children,
    allowedChildren: "any",
    schema: {} as any,
    type: "element",
    lineStart: children[0]?.lineStart || 0,
    lineEnd: children[children.length - 1]?.lineEnd || 0,
    columnStart: children[0]?.columnStart || 0,
    columnEnd: children[children.length - 1]?.columnEnd || 0,
  });
}

function shouldConvertParagraphToLlm(
  node: AIMLNode,
  parentNode?: IBaseElement
): boolean {
  // Convert if direct child of a state node
  if (parentNode?.role === "state") {
    return true;
  }

  return false;
}

function convertParagraphToText(paragraphNode: AIMLNode): IBaseElement {
  let textContent = "";
  if (paragraphNode.children) {
    for (const child of paragraphNode.children) {
      if (child.type === "text") {
        textContent += (child as TextNode).value;
      } else if (child.type === "expression") {
        textContent += `\${${(child as ExpressionNode).value}}`;
      }
    }
  }

  return new BaseElement({
    id: `text-${paragraphNode.key}`,
    key: paragraphNode.key,
    tag: "content",
    role: "output",
    elementType: "content",
    attributes: {
      content: textContent,
    },
    children: [],
    allowedChildren: "none",
    schema: {} as any,
    type: "element",
    lineStart: paragraphNode.lineStart,
    lineEnd: paragraphNode.lineEnd,
    columnStart: paragraphNode.columnStart,
    columnEnd: paragraphNode.columnEnd,
  });
}
