import {
  DiagnosticSeverity,
  type Diagnostic,
  type SerializedBaseElement,
} from "@fireworks/shared";
import * as allElements from "./elements";
import type { BaseElement } from "./elements/BaseElement";
import type { createElementDefinition } from "./elements/createElementFactory";

/**
 * Convert a SerializedBaseElement tree to a BaseElement tree.
 * This function assumes the SerializedBaseElement tree is already in the correct structure
 * with all necessary transformations (paragraphs to LLM, comments assigned, etc.) already done.
 *
 * @param nodes The SerializedBaseElement tree to convert
 * @returns The root BaseElement of the tree
 */
export function hydreateElementTree(
  nodes: SerializedBaseElement[],
  diagnostics: Set<Diagnostic>
): { elementTree?: BaseElement; diagnostics: Set<Diagnostic> } {
  // Assume the first node is the workflow
  const rootNode = nodes[0];

  if (!rootNode) {
    throw new Error("No nodes provided to hydrate");
  }

  if (rootNode.astSourceType !== "element" || rootNode.tag !== "workflow") {
    throw new Error("Root node must be a workflow element");
  }

  // Create the root element
  const rootElement = hydrateElement(
    rootNode as SerializedBaseElement,
    undefined,
    diagnostics
  );

  return {
    elementTree: rootElement.element,
    diagnostics: rootElement.diagnostics,
  };
}

/**
 * Hydrate a SerializedBaseElementinto a BaseElement
 */
function hydrateElement(
  node: SerializedBaseElement,
  parentElement: BaseElement | undefined,
  diagnostics: Set<Diagnostic>
): { element?: BaseElement; diagnostics: Set<Diagnostic> } {
  if (node.astSourceType !== "element") {
    throw new Error(
      `Cannot hydrate non-element node of type ${node.astSourceType}`
    );
  }

  // Get the constructor for this element type
  const Constructor = getElementClassByTagName(node.tag as any);

  // Create the element
  let element: BaseElement | undefined = undefined;
  try {
    element = Constructor.initFromAttributesAndNodes(
      node.attributes || {},
      [], // Empty children array, will add children after element is created
      parentElement ? new WeakRef(parentElement) : undefined,
      node.scope as ["root", ...string[]]
    );
  } catch (error) {
    if (error instanceof Error) {
      diagnostics.add({
        message: error.message,
        severity: DiagnosticSeverity.Error,
        source: "AIML",
        code: "100",
        range: {
          start: {
            line: node.lineStart,
            column: node.columnStart,
          },
          end: {
            line: node.lineEnd,
            column: node.columnEnd,
          },
        },
      });
    } else {
      diagnostics.add({
        message: "Unable to parse AIML Element",
        severity: DiagnosticSeverity.Error,
        source: "AIML",
        code: "101",
        range: {
          start: {
            line: node.lineStart,
            column: node.columnStart,
          },
          end: {
            line: node.lineEnd,
            column: node.columnEnd,
          },
        },
      });
    }
  }
  // Process children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (child.astSourceType === "element") {
        // Recursively hydrate child elements
        const childElement = hydrateElement(
          child as SerializedBaseElement,
          element,
          diagnostics
        );
        if (element && childElement.element) {
          element.children.push(childElement.element);
        }
        childElement.diagnostics.forEach((diagnostic) => {
          diagnostics.add(diagnostic);
        });
      }
      // Ignore non-element children, they should have been processed by the parser
    }
  }

  return { element, diagnostics };
}

/**
 * Get the element class by tag name
 */
export function getElementClassByTagName<
  Tag extends Exclude<keyof typeof allElements, "BaseElement">,
>(tagName: Tag): ReturnType<typeof createElementDefinition> {
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

  return ElementClass as ReturnType<typeof createElementDefinition>;
}

/**
 * Check if a tag is a supported element name
 */
export function isSupportedElementName(tagName: string): boolean {
  return Object.keys(allElements).some(
    (key) => key.toLowerCase() === tagName.toLowerCase()
  );
}
