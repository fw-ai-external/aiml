import {
  type SerializedElement,
  type SerializedBaseElement,
} from "@fireworks/types";
import * as allElements from "@fireworks/elements";
import { BaseElement } from "@fireworks/shared";

/**
 * Convert a SerializedBaseElement tree to a BaseElement tree.
 * This function assumes the SerializedBaseElement tree is already in the correct structure
 * with all necessary transformations (paragraphs to LLM, comments assigned, etc.) already done.
 *
 * @param nodes The SerializedBaseElement tree to convert
 * @returns The root BaseElement of the tree
 */
export function hydreateElementTree(
  nodes: SerializedBaseElement[]
): BaseElement {
  // Assume the first node is the workflow
  const rootNode = nodes[0];

  if (!rootNode) {
    throw new Error("No nodes provided to hydrate");
  }

  if (rootNode.type !== "element" || rootNode.elementType !== "workflow") {
    throw new Error("Root node must be a workflow element");
  }

  // Create the root element
  const rootElement = hydrateElement(rootNode as SerializedElement);

  return rootElement;
}

/**
 * Hydrate a SerializedElement into a BaseElement
 */
function hydrateElement(
  node: SerializedElement,
  parentElement?: BaseElement
): BaseElement {
  if (node.type !== "element") {
    throw new Error(`Cannot hydrate non-element node of type ${node.type}`);
  }

  // Get the constructor for this element type
  const Constructor = getElementClassByTagName(node.tag);

  // Create the element
  const element = Constructor.initFromAttributesAndNodes(
    node.attributes || {},
    [], // Empty children array, will add children after element is created
    parentElement ? new WeakRef(parentElement) : undefined
  ) as BaseElement;

  // Process children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (child.type === "element") {
        // Recursively hydrate child elements
        const childElement = hydrateElement(
          child as SerializedElement,
          element
        );
        element.children.push(childElement);
      }
      // Ignore non-element children, they should have been processed by the parser
    }
  }

  return element;
}

/**
 * Get the element class by tag name
 */
export function getElementClassByTagName(tagName: string) {
  const normalizedTagName = tagName.toLowerCase();
  const matchingKey = Object.keys(allElements).find(
    (key) => key.toLowerCase() === normalizedTagName
  );
  if (!matchingKey) {
    throw new Error("Invalid tagName " + tagName);
  }
  // Exclude BaseElement from being used directly
  if (matchingKey === "BaseElement") {
    throw new Error(`BaseElement cannot be used directly for tag: ${tagName}`);
  }

  const ElementClass = allElements[matchingKey as keyof typeof allElements];
  if (ElementClass === BaseElement) {
    throw new Error(`BaseElement cannot be used directly for tag: ${tagName}`);
  }
  return ElementClass as Exclude<typeof ElementClass, typeof BaseElement>;
}

/**
 * Check if a tag is a supported element name
 */
export function isSupportedElementName(tagName: string): boolean {
  return Object.keys(allElements).some(
    (key) => key.toLowerCase() === tagName.toLowerCase()
  );
}
