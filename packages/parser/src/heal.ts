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
    (node) => node.type === "element" && node.elementType === "workflow"
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

  // Helper function to convert a node to an element
  const convertNodeToElement = (node: AIMLNode): IBaseElement => {
    if (node.type === "element") {
      // Already an element, create a new BaseElement with processed children
      const elementNode = node as IBaseElement;

      // Create a new array for processed children
      const processedChildren: IBaseElement[] = [];

      // Process all children recursively
      if (elementNode.children) {
        for (const child of elementNode.children) {
          if (child.type === "element") {
            // Recursively process element children
            processedChildren.push(convertNodeToElement(child as AIMLNode));
          } else if (child.type === "paragraph") {
            // Convert paragraph to llm element
            processedChildren.push(convertParagraphToLlm(child as AIMLNode));
          } else if (child.type === "expression") {
            // Convert expression to script element
            processedChildren.push(
              convertExpressionToScript(child as AIMLNode)
            );
          } else if (child.type === "comment") {
            // Collect comments to be assigned later
            comments.push(child as CommentNode);
          } else if (child.type === "text") {
            // Check if the text contains expressions
            const textValue = (child as TextNode).value?.toString() || "";
            if (textValue.includes("{") && textValue.includes("}")) {
              // Create a script element for the expression
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
              // Keep the text node as is
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
          // Ignore other node types
        }
      }

      // Create a new BaseElement with the processed children
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
      return convertParagraphToLlm(node);
    } else if (node.type === "expression") {
      return convertExpressionToScript(node);
    } else {
      // Default case: create a generic element
      return new BaseElement({
        id: `generic-${node.key}`,
        key: node.key,
        tag: "script", // Default to script
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
  };

  // Helper function to convert paragraph to llm element
  const convertParagraphToLlm = (paragraphNode: AIMLNode): IBaseElement => {
    // Extract text from paragraph children
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

    // Create an llm element with the paragraph text as prompt
    return new BaseElement({
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
  };

  // Helper function to convert expression to script element
  const convertExpressionToScript = (
    expressionNode: AIMLNode
  ): IBaseElement => {
    // Create a script element with the expression value
    return new BaseElement({
      id: `script-${expressionNode.key}`,
      key: expressionNode.key,
      tag: "script",
      role: "action",
      elementType: "script",
      attributes: {
        content: (expressionNode as ExpressionNode).value,
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
  };

  // Process all nodes and convert them to elements
  const processedNodes: IBaseElement[] = [];

  // First pass: Process all top-level nodes
  for (const node of nodes) {
    if (node.type === "comment") {
      // Collect comments to be assigned later
      comments.push(node as CommentNode);
    } else if (node.type === "paragraph") {
      // Convert paragraphs to llm elements
      processedNodes.push(convertParagraphToLlm(node));
    } else if (node.type === "expression") {
      // Convert expressions to script elements
      processedNodes.push(convertExpressionToScript(node));
    } else if (node.type === "element") {
      // Process element nodes recursively
      processedNodes.push(convertNodeToElement(node));
    }
    // Ignore other node types
  }

  // Add all processed nodes to the root element
  for (const node of processedNodes) {
    if (node !== rootElement) {
      // Check if this is an action element without a state ancestor
      if (node.role === "action") {
        let hasStateAncestor = false;
        let currentParent = node.parent;

        // Check if the element has a state ancestor
        while (currentParent) {
          if ((currentParent as IBaseElement).role === "state") {
            hasStateAncestor = true;
            break;
          }
          currentParent = (currentParent as IBaseElement).parent;
        }

        // If no state ancestor, add it to the root element
        if (!hasStateAncestor && rootElement) {
          rootElement.children.push(node);
        }
      } else if (rootElement && !node.parent) {
        // Add orphaned elements to the root
        rootElement.children.push(node);
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

  // Final pass: Ensure all nodes in the tree are elements
  const ensureAllNodesAreElements = (element: IBaseElement): IBaseElement => {
    // Create a new array for processed children
    const processedChildren: IBaseElement[] = [];

    // Process all children recursively
    for (const child of element.children) {
      if (child.type === "element") {
        // Recursively process element children
        processedChildren.push(
          ensureAllNodesAreElements(child as IBaseElement)
        );
      } else {
        // Convert non-element nodes to elements
        if (child.type === "paragraph") {
          processedChildren.push(convertParagraphToLlm(child as AIMLNode));
        } else if (child.type === "expression") {
          processedChildren.push(convertExpressionToScript(child as AIMLNode));
        } else if (child.type === "text") {
          // Convert text to element
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
          // Default case: create a generic element
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
    }

    // Create a new element with the processed children
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
  };

  // Ensure all nodes in the tree are elements
  const finalRootElement = ensureAllNodesAreElements(rootElement);

  return finalRootElement;
}
