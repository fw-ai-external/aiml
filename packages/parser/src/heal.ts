import { AIMLNode } from "./index";
import {
  IBaseElement,
  TextNode,
  ExpressionNode,
  CommentNode,
  HeaderNode,
} from "@fireworks/types";
import { BaseElement } from "./BaseElement";

export function astToRunnableBaseElementTree(nodes: AIMLNode[]): IBaseElement {
  // 1. root level type of paragraph, should be converted to an llm element with a prompt attribute with the value of the paragraphs text
  // (Paragraphs children are always (TextNode | ExpressionNode)[])

  // 2. any element with a role of action, should have an ansester that has a role if state, or else one should be added as high up as possible

  // 3. comments need to be reduced into the nearest IBaseElement in the comments array

  // TODO figure out how to handle imports next... but for now we will just return the nodes

  // 4. Header node's children (always HeaderFieldNode[]) should be converted to be attributes of the top level element

  // First, let's find the header node if it exists
  const headerNode = nodes.find((node) => node.type === "header") as
    | HeaderNode
    | undefined;

  // Create a workflow element as the root if no root element exists
  let rootElement: IBaseElement | undefined;

  // Find the first element that could be a root
  const rootElementNode = nodes.find(
    (node) =>
      node.type === "element" &&
      (node.elementType === "workflow" || node.elementType === "state")
  ) as IBaseElement | undefined;

  if (rootElementNode) {
    rootElement = rootElementNode;
  } else {
    // Create a new workflow element as the root
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

  // Process header node if it exists
  if (headerNode && headerNode.children) {
    // Convert header fields to attributes of the root element
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

  // Collect all comments to be assigned to the nearest elements
  const comments: CommentNode[] = [];

  // First pass: Process all top-level nodes
  for (const node of nodes) {
    if (node.type === "comment") {
      // Collect comments to be assigned later
      comments.push(node as CommentNode);
    } else if (node.type === "paragraph" && node !== rootElement) {
      // Convert root level paragraphs to llm elements
      const paragraphNode = node as AIMLNode;

      // Extract text from paragraph children
      let promptText = "";
      if (paragraphNode.children) {
        for (const child of paragraphNode.children) {
          if (child.type === "text") {
            promptText += (child as TextNode).value;
          } else if (child.type === "expression") {
            promptText += `{${(child as ExpressionNode).value}}`;
          }
        }
      }

      // Create an llm element with the paragraph text as prompt
      const llmElement = new BaseElement({
        id: `llm-${paragraphNode.key}`,
        key: paragraphNode.key,
        tag: "llm",
        role: "output",
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

      // Add the llm element to the root
      if (rootElement && rootElement !== node) {
        rootElement.children.push(llmElement);
      }
    } else if (node.type === "expression" && node !== rootElement) {
      // Convert expressions to script elements
      const expressionNode = node as ExpressionNode;

      // Create a script element with the expression value
      const scriptElement = new BaseElement({
        id: `script-${expressionNode.key}`,
        key: expressionNode.key,
        tag: "script",
        role: "action",
        elementType: "script",
        attributes: {
          content: expressionNode.value,
        },
        children: [],
        allowedChildren: "none",
        schema: {} as any,
        type: "element",
        lineStart: expressionNode.lineStart,
        lineEnd: expressionNode.lineEnd,
        columnStart: expressionNode.columnStart,
        columnEnd: expressionNode.columnEnd,
      });

      // Add the script element to the root
      if (rootElement && rootElement !== node) {
        rootElement.children.push(scriptElement);
      }
    } else if (node.type === "element" && node !== rootElement) {
      // Process element nodes
      const elementNode = node as IBaseElement;

      // Check if this is an action element without a state ancestor
      if (elementNode.role === "action") {
        let hasStateAncestor = false;
        let currentParent = elementNode.parent;

        // Check if the element has a state ancestor
        while (currentParent) {
          if ((currentParent as IBaseElement).role === "state") {
            hasStateAncestor = true;
            break;
          }
          currentParent = (currentParent as IBaseElement).parent;
        }

        // If no state ancestor, add it to the root element
        if (!hasStateAncestor && rootElement && rootElement !== elementNode) {
          // Remove from its current parent if it has one
          if (elementNode.parent) {
            const parentElement = elementNode.parent as IBaseElement;
            const index = parentElement.children.findIndex(
              (child) => child.key === elementNode.key
            );
            if (index !== -1) {
              parentElement.children.splice(index, 1);
            }
          }

          // Add to the root element
          rootElement.children.push(elementNode);
        }
      } else if (
        rootElement &&
        rootElement !== elementNode &&
        !elementNode.parent
      ) {
        // Add orphaned elements to the root
        rootElement.children.push(elementNode);
      }
    }
  }

  // Assign comments to the nearest elements
  if (comments.length > 0) {
    // Helper function to recursively assign comments to elements
    const assignCommentsToElement = (
      element: IBaseElement,
      remainingComments: CommentNode[]
    ) => {
      // Find comments that are closest to this element
      const elementComments: CommentNode[] = [];
      const otherComments: CommentNode[] = [];

      for (const comment of remainingComments) {
        // Simple heuristic: if comment is before the element, it belongs to it
        if (comment.lineEnd <= element.lineStart) {
          elementComments.push(comment);
        } else {
          otherComments.push(comment);
        }
      }

      // Assign comments to this element
      if (elementComments.length > 0) {
        (element as any).comments = elementComments;
      }

      // Recursively process children
      for (const child of element.children) {
        if (child.type === "element") {
          assignCommentsToElement(child as IBaseElement, otherComments);
        }
      }
    };

    // Start assigning comments from the root
    assignCommentsToElement(rootElement, comments);
  }

  return rootElement as IBaseElement;
}
