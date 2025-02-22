import { v4 as uuidv4 } from "uuid";
import { type Element as XMLElement, xml2js } from "xml-js";
import {
  ElementError,
  InternalError,
  isSupportedNodeName,
  type SCXMLNodeType,
  type IBaseElement,
} from "@fireworks/types";
import { warnOnDuplicateKeys } from "./utils";
import { BaseElement } from "./BaseElement";
import { z } from "zod";

export async function fromXML(xml: string): Promise<IBaseElement> {
  const parsedXml = await xml2js(xml);
  const machineElement = parsedXml.elements.find((element: XMLElement) =>
    isSupportedNodeName(element.name || "")
  );

  if (!machineElement) {
    throw new InternalError("Root node not found");
  }

  // Parse into TagNode (which extends SCXMLState)
  const rootNode = parseNode(machineElement, []);

  // Validate the state machine
  warnOnDuplicateKeys(new Set<string>(), rootNode);

  return rootNode;
}

function parseNode(node: XMLElement, parents: IBaseElement[]): IBaseElement {
  if (node.type === "comment") {
    return createCommentElement(node.comment);
  }

  if (node.type === "text") {
    return createTextElement(node.text);
  }

  const nodeName = node.name;
  if (!nodeName) {
    throw new ElementError(
      `Node name is missing (type: ${node.type || "unknown"})`
    );
  }

  if (!node.attributes?.id && !node.attributes?.key) {
    if (!node.attributes) {
      node.attributes = {};
    }
    node.attributes.id = uuidv4();
  }

  const children =
    node.elements?.map((element) => parseNode(element, [...parents])) ?? [];

  return createElementFromNode(node, parents, children);
}

function createCommentElement(comment: string | undefined): IBaseElement {
  return new BaseElement({
    id: uuidv4(),
    key: uuidv4(),
    tag: "comment",
    role: "state",
    elementType: "state",
    attributes: { comment },
    children: [],
    allowedChildren: "none",
    schema: z.object({ comment: z.string().optional() }),
  });
}

function createTextElement(
  text: string | number | boolean | undefined
): IBaseElement {
  return new BaseElement({
    id: uuidv4(),
    key: uuidv4(),
    tag: "text",
    role: "state",
    elementType: "state",
    attributes: { text },
    children: [],
    allowedChildren: "none",
    schema: z.object({
      text: z.union([z.string(), z.number(), z.boolean()]).optional(),
    }),
  });
}

function createElementFromNode(
  node: XMLElement,
  parents: IBaseElement[],
  children: IBaseElement[]
): IBaseElement {
  const attributes = node.attributes || {};
  const id = String(attributes.id || attributes.key || uuidv4());
  const key = String(attributes.key || attributes.id || uuidv4());

  return new BaseElement({
    id,
    key,
    tag: node.name as string,
    role: "state",
    elementType: node.name as SCXMLNodeType,
    attributes,
    children,
    parent: parents[parents.length - 1],
    allowedChildren: "any",
    schema: z.object({}),
  });
}
