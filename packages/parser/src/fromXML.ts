import { v4 as uuidv4 } from "uuid";
import { type Element as XMLElement, xml2js } from "xml-js";
import type { CommentNode, FireAgentNode, TextNode } from "./types";
import {
  isSupportedNodeName,
  ElementError,
  InternalError,
  BaseElement,
} from "@fireworks/core";
import { warnOnDuplicateKeys } from "./utils";

export async function fromXML(xml: string): Promise<BaseElement> {
  const parsedXml = await xml2js(xml);
  const machineElement = parsedXml.elements.find((element: XMLElement) =>
    isSupportedNodeName(element.name || "")
  );

  // Parse into TagNode (which extends SCXMLState)
  const rootNode = parseNode(machineElement, []);

  if (!rootNode) {
    throw new InternalError("Root node not found");
  }

  // Validate the state machine
  warnOnDuplicateKeys(new Set<string>(), rootNode);

  return rootNode as BaseElement;
}

function parseNode(node: XMLElement, parents: BaseElement[]): FireAgentNode {
  if (node.type === "comment") {
    return {
      kind: "comment",
      comment: node.comment,
    } as CommentNode;
  }
  if (node.type === "text") {
    return {
      kind: "text",
      text: node.text,
    } as TextNode;
  }
  const nodeName = node.name;
  if (!nodeName) {
    throw new ElementError("Node name is missing", node.type || "");
  }
  if (!node.attributes?.id && !node.attributes?.key) {
    if (!node.attributes) {
      node.attributes = {};
    }
    node.attributes.key = uuidv4();
  }
  const ElementClass = getNodeDefinitionClass(nodeName);

  // Convert attributes to proper format
  const attributes = Object.entries(node.attributes || {}).reduce(
    (acc, [key, value]) => {
      acc[key] = value?.toString() || "";
      return acc;
    },
    {} as Record<string, string>
  );

  // Parse child nodes first
  const childNodes: FireAgentNode[] = [];
  let textValue: string | undefined;

  if (node.elements) {
    const parsedChildren = node.elements.map((child) =>
      parseNode(child, parents)
    );

    // Check if all children are text nodes
    const allTextNodes = parsedChildren.every(
      (node) => "kind" in node && node.kind === "text"
    );

    if (allTextNodes) {
      textValue = parsedChildren
        .map((node) => ("text" in node ? node.text : ""))
        .join("");
    } else {
      childNodes.push(...parsedChildren);
    }
  }

  // If we found text content, add it as a value prop
  if (textValue !== undefined) {
    attributes.value = textValue;
  }

  // Create BaseElement instance with children
  return ElementClass.initFromAttributesAndNodes(
    attributes,
    childNodes as BaseElement[],
    parents
  ) as BaseElement;
}
