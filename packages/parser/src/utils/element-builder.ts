import {
  allElementConfigs,
  type SerializedBaseElement,
} from "@fireworks/shared";
import {
  type JsxAttributeLike,
  type JsxElement,
  type JsxSelfClosingElement,
  Node,
} from "ts-morph";
import { v4 as uuidv4 } from "uuid";

export class ElementBuilder {
  /**
   * Creates a serialized base element from a JSX element
   */
  static createBaseElement(
    element: JsxSelfClosingElement | JsxElement,
    attributes: Record<string, string>,
    children: SerializedBaseElement[] = []
  ): SerializedBaseElement {
    const tagName = Node.isJsxSelfClosingElement(element)
      ? element.getTagNameNode().getText()
      : element.getOpeningElement().getTagNameNode().getText();

    const config =
      allElementConfigs[
        tagName.toLowerCase() as keyof typeof allElementConfigs
      ];

    // Throw an error if the config is not found for the tag
    if (!config) {
      throw new Error(`Unknown element tag found: ${tagName}`);
    }

    // Generate a UUID if no id is provided
    const id = attributes.id || uuidv4();

    return {
      astSourceType: "element",
      id,
      key: `element-${id}`,
      scope: ["root"],
      tag: tagName.toLowerCase(),
      type: config.type,
      subType: config.subType,
      attributes,
      children,
      lineStart: element.getStartLineNumber(),
      lineEnd: element.getEndLineNumber(),
      columnStart: 0, // Default to 0 since getStartColumnNumber() isn't available
      columnEnd: 0, // Default to 0 since getEndColumnNumber() isn't available
    };
  }
  /**
   * Parses JSX attributes into a key-value record
   */
  static parseAttributes(
    attributes: JsxAttributeLike[]
  ): Record<string, string> {
    // Initialize with an empty object
    const result: Record<string, string> = {};

    // If no attributes, return early to avoid issues with length property
    if (!attributes || attributes.length === 0) {
      return result;
    }

    attributes.forEach((attr) => {
      if (Node.isJsxAttribute(attr)) {
        const name = attr.getNameNode().getText();
        const initializer = attr.getInitializer();
        if (initializer) {
          if (Node.isStringLiteral(initializer)) {
            result[name] = initializer.getText().replace(/['"]/g, "");
          } else if (Node.isJsxExpression(initializer)) {
            const expression = initializer.getExpression();
            if (expression && Node.isStringLiteral(expression)) {
              result[name] = expression.getText().replace(/['"]/g, "");
            }
          }
        } else {
          // Handle boolean attributes
          result[name] = "true";
        }
      }
      // Skip JsxSpreadAttribute for now
    });

    return result;
  }
}
