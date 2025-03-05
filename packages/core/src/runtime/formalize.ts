import type {
  IBaseElement,
  TextNode,
  ExpressionNode,
  CommentNode,
  HeaderNode,
  AIMLNode,
} from "@fireworks/types";
import { BaseElement } from "./";
import {
  getElementClassByTagName,
  isSupportedElementName,
  Workflow,
} from "../element";

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
    rootElement = Workflow.initFromAttributesAndNodes(
      rootElementNode.attributes,
      rootElementNode.children,
      []
    ) as BaseElement;
  } else {
    isAutoCreatedWorkflow = true;
    rootElement = Workflow.initFromAttributesAndNodes(
      {
        id: "workflow-root",
      },
      nodes,
      []
    ) as BaseElement;
  }

  if (headerNode && headerNode.children) {
    for (const field of headerNode.children) {
      if (
        field.type === "headerField" &&
        field.id &&
        field.value !== undefined &&
        rootElement
      ) {
        rootElement.attributes[field.id] = field.value as string;
      }
    }
  }

  const comments: CommentNode[] = [];
  const processedNodes: BaseElement[] = [];
  const rootLevelParagraphs: BaseElement[] = [];

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

function convertParagraphToLlm(
  paragraphNode: AIMLNode,
  parentNode?: BaseElement
): BaseElement {
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
  const LLM = getElementClassByTagName("llm");

  return LLM.initFromAttributesAndNodes(
    {
      prompt: promptText,
      // TODO: Make this configurable
      model: "gpt-4o",
    },
    [],
    []
  ) as BaseElement;
}

function convertNodeToElement(
  node: AIMLNode,
  comments: CommentNode[],
  parentNode?: BaseElement
): BaseElement {
  if (node.type === "element") {
    const elementNode = node as IBaseElement;
    if (!isSupportedElementName(elementNode.tag)) {
      throw new Error(
        "Element tag " +
          elementNode.tag +
          " is not supported --" +
          JSON.stringify(elementNode)
      );
    }
    const Constructor = getElementClassByTagName(elementNode.tag);
    const element = Constructor.initFromAttributesAndNodes(
      elementNode.attributes || {},
      elementNode.children || [],
      parentNode ? [new WeakRef(parentNode)] : []
    ) as BaseElement;

    if (elementNode.children) {
      for (const child of elementNode.children) {
        if (child.type === "element") {
          element.children.push(convertNodeToElement(child, comments, element));
        } else if (child.type === "paragraph") {
          if (shouldConvertParagraphToLlm(child, elementNode)) {
            element.children.push(convertParagraphToLlm(child, element));
          } else {
            element.children.push(convertParagraphToText(child));
          }
        } else if (child.type === "comment") {
          comments.push(child as CommentNode);
        } else if (child.type === "text" && parentNode) {
          parentNode.attributes.content = (child as TextNode).value;
        }
      }
    }

    return element;
  } else if (node.type === "paragraph") {
    if (shouldConvertParagraphToLlm(node, parentNode)) {
      return convertParagraphToLlm(node, parentNode);
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

function ensureAllNodesAreElements(element: BaseElement): BaseElement {
  const processedChildren: IBaseElement[] = [];

  if (element.children) {
    for (const child of element.children) {
      if (child.type === "element") {
        processedChildren.push(ensureAllNodesAreElements(child as BaseElement));
      } else if (child.type === "paragraph") {
        processedChildren.push(
          convertParagraphToLlm(child as AIMLNode, element)
        );
      } else if (child.type === "text") {
        // TODO value shopuld hav been converted to a string and passed as an argument
        // to the parent
        throw new Error(
          "Text node should have been converted to an argument of the parent"
        );
      } else {
        throw new Error(
          "Node of type " +
            child.type +
            " should have been converted to an argument of the parent"
        );
      }
    }
  }

  if (!isSupportedElementName(element.tag)) {
    throw new Error(
      "Element tag " +
        element.tag +
        " is not supported" +
        JSON.stringify(element)
    );
  }

  const Constructor = getElementClassByTagName(element.tag);

  return Constructor.initFromAttributesAndNodes(
    element.attributes,
    processedChildren,
    element.parent ? [element.parent] : []
  ) as BaseElement;
}

function createStateElement(id: string, children: BaseElement[]): BaseElement {
  const State = getElementClassByTagName("state");

  return State.initFromAttributesAndNodes({ id }, children, []) as BaseElement;
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

function convertParagraphToText(paragraphNode: AIMLNode): BaseElement {
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

  throw new Error(
    "Not implemented, text conversion is needed in an unexpected location"
  );
}
