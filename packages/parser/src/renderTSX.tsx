import React from "react";
import {
  getNodeDefinitionClass,
  isSupportedNodeName,
} from "@fireworks/element-types";
import type { FireAgentNode, IBaseElement } from "@fireworks/types";
import {
  ElementError,
  InternalError,
  CompositionError,
} from "@fireworks/types";
import { warnOnDuplicateKeys } from "./utils";
import { v4 as uuidv4 } from "uuid";
import { BaseElement } from "./BaseElement";
import { z } from "zod";

type ReactElementType = React.ReactElement<{
  children?: React.ReactNode;
  [key: string]: any;
}>;

export type ReactElements =
  | ReactElementType
  | React.ReactNode
  | FireAgentNode
  | ReactElements[];

const isReactTagElement = (
  element: ReactElements
): element is ReactElementType => {
  return (
    typeof element === "object" &&
    element !== null &&
    !Array.isArray(element) &&
    "type" in element &&
    "props" in element &&
    typeof element.type !== "undefined" &&
    typeof element.props === "object"
  );
};

export function renderTSX(rootElement: ReactElements): IBaseElement {
  if (!rootElement) {
    throw new InternalError("Root element is required");
  }

  const rootNode = instanciateNode(rootElement);

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

  // Validate the state machine
  warnOnDuplicateKeys(new Set<string>(), rootNode);

  return rootNode;
}

export function instanciateNode(
  element: ReactElements,
  parents: BaseElement[] = []
): IBaseElement | IBaseElement[] | null {
  // Handle null/undefined
  if (!element) {
    return null;
  }

  // Handle arrays
  if (Array.isArray(element)) {
    return element
      .map((child) => instanciateNode(child, parents))
      .filter((node): node is IBaseElement | IBaseElement[] => node !== null)
      .flat();
  }

  // Handle primitive values
  if (
    typeof element === "string" ||
    typeof element === "number" ||
    typeof element === "boolean"
  ) {
    return new BaseElement({
      id: uuidv4(),
      key: uuidv4(),
      tag: "text",
      role: "state",
      elementType: "state",
      attributes: { text: String(element) },
      children: [],
      allowedChildren: "none",
      schema: z.object({}),
    });
  }

  // Handle FireAgentNode
  if (
    typeof element === "object" &&
    "kind" in element &&
    (element.kind === "text" ||
      element.kind === "comment" ||
      element.kind === "instruction")
  ) {
    return new BaseElement({
      id: element.key || uuidv4(),
      key: element.key || uuidv4(),
      tag: element.kind,
      role: "state",
      elementType: "state",
      attributes:
        element.kind === "text"
          ? { text: String(element.text) }
          : element.kind === "comment"
            ? { comment: String(element.comment) }
            : { instruction: String(element.instruction) },
      children: [],
      allowedChildren: "none",
      schema: z.object({}),
    });
  }

  // Handle React elements
  if (!isReactTagElement(element)) {
    return null;
  }

  const tagName = element.type.toString();

  if (!isSupportedNodeName(tagName)) {
    throw new ElementError(`Unsupported element type: ${tagName}`);
  }

  const ElementClass = getNodeDefinitionClass(tagName);

  // Convert children to BaseElement instances
  const childNodes = React.Children.toArray(element.props.children)
    .map((child) => instanciateNode(child as ReactElements, parents))
    .filter((node): node is IBaseElement | IBaseElement[] => node !== null)
    .flat();

  // Create BaseElement instance with children
  return new BaseElement({
    id: element.props.id || uuidv4(),
    key: element.props.key?.toString() || uuidv4(),
    tag: tagName,
    role: ElementClass.role || "state",
    elementType: ElementClass.scxmlType || (tagName as SCXMLNodeType),
    attributes: element.props,
    children: childNodes,
    allowedChildren: ElementClass.allowedChildren || "any",
    schema: ElementClass.propsSchema || z.object({}),
  });
}
