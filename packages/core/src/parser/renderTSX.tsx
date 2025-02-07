import React from "react";
import { getNodeDefinitionClass, isSupportedNodeName } from "../element";
import { CompositionError, ElementError, InternalError } from "../errors";
import type { ReactTagNodeDefinition } from "../element/createElementDefinition";
import type { FireAgentNode, TextNode } from "./types";
import { warnOnDuplicateKeys } from "./utils";
import { BaseElement } from "../runtime/BaseElement";
export type ReactElements =
  | React.ReactElement<
      {
        children?: React.ReactElement | React.ReactElement[];
        [key: string]: any;
      },
      any
    >
  | string
  | number
  | boolean
  | null
  | undefined
  | ReactTagNodeDefinition
  | FireAgentNode
  | ReactElements[];

const isReactTagElement = (
  element: ReactElements
): element is React.ReactElement<any, any> => {
  return (
    typeof element === "object" &&
    element !== null &&
    "type" in element &&
    "props" in element
  );
};

export function renderTSX(rootElement: ReactElements): BaseElement {
  if (!rootElement) {
    throw new InternalError("Root element is required");
  }

  const rootNode = instanciateNode(rootElement, []);

  if (!rootNode) {
    throw new InternalError("Root node not found");
  }

  if (Array.isArray(rootNode)) {
    throw new CompositionError(
      "Root of a FireAgent machine can only be a single element",
      {
        multipleRootElements: rootNode.length,
      }
    );
  }

  // check for duplicate ids
  warnOnDuplicateKeys(new Set<string>(), rootNode);

  return rootNode as BaseElement;
}

export function instanciateNode(
  element: ReactElements,
  parents: BaseElement[]
): FireAgentNode | FireAgentNode[] | null {
  if (!element) {
    return null;
  }

  if (typeof element !== "object") {
    // Handle primitives (string, number, boolean)
    return {
      kind: "text",
      text: String(element),
    } as TextNode;
  }

  // Handle arrays
  if (Array.isArray(element)) {
    return element
      .map((child) => instanciateNode(child, parents))
      .flat()
      .filter(Boolean) as FireAgentNode[];
  }

  // Handle React elements
  if (isReactTagElement(element)) {
    // if (!element.key) {
    //   element.key = uuidv4();
    // }

    // const props: Record<string, any> = element.props as Record<string, any>;
    const { children, ...props } = element.props as any as {
      children: FireAgentNode[];
      [key: string]: any;
    };
    if (element.type === React.Fragment && children) {
      // const children = props.children as ReactElements[] | undefined;

      // Handle React.Fragment
      return children
        ?.map((child: ReactElements) => instanciateNode(child, parents))
        .flat()
        .filter(Boolean) as FireAgentNode[];
    }

    const nodeName = element.type?.tag || element.type;
    if (!nodeName || !isSupportedNodeName(nodeName)) {
      throw new ElementError(
        `Unsupported node type: ${String(nodeName)}`,
        String(nodeName)
      );
    }

    const ElementClass = getNodeDefinitionClass(nodeName);
    // Process children
    let childNodes: FireAgentNode[] = [];
    let textValue: string | undefined;

    if (children !== undefined) {
      // Handle text content directly
      if (
        typeof children === "string" ||
        typeof children === "number" ||
        typeof children === "boolean"
      ) {
        textValue = String(children);
      } else {
        // Handle nested children
        const parsedChildren = instanciateNode(children, [...parents]);

        if (parsedChildren == null) {
          childNodes = [];
        } else if (Array.isArray(parsedChildren)) {
          // Check if all children are text nodes
          const allTextNodes = parsedChildren.every(
            (node) => "kind" in node && node.kind === "text"
          );
          if (allTextNodes) {
            textValue = parsedChildren
              .map((node) => ("text" in node ? node.text : ""))
              .join("");
          } else {
            childNodes = parsedChildren;
          }
        } else if ("kind" in parsedChildren && parsedChildren.kind === "text") {
          textValue = String(parsedChildren.text);
        } else {
          childNodes = [parsedChildren];
        }
      }
    }

    // Validate children
    childNodes.forEach((childNode) => {
      if (!(childNode instanceof BaseElement)) {
        return;
      }
      const childName = childNode.elementType;
      if (!childName) return; // comment or text node

      if (!ElementClass.areChildrenAllowed([childName])) {
        throw new CompositionError(
          `Element type "${nodeName}" does not allow children of type ${childNode.elementType}`,
          {
            childrenError: [nodeName, childNode.elementType],
          }
        );
      }
    });

    // If we found text content, add it as a value prop
    if (textValue !== undefined) {
      props.value = textValue;
    }

    return ElementClass.initFromAttributesAndNodes(props, childNodes, parents);
  }

  // Handle pre-existing FireAgentNodes
  if ("kind" in element) {
    return element as FireAgentNode;
  }

  return null;
}
