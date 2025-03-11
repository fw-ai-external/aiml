import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxAttributeLike,
} from "ts-morph";
import { v4 as uuidv4 } from "uuid";
import type {
  ElementRole,
  SerializedBaseElement,
  ElementType,
  BuildContext,
} from "@fireworks/types";
import { z } from "zod";

export class ElementBuilder {
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

  /**
   * Determines the role of an element based on its tag name
   */
  static determineRole(tagName: string): ElementRole {
    const lowerTagName = tagName.toLowerCase();
    if (lowerTagName.includes("action")) {
      return "action";
    } else if (lowerTagName.includes("input")) {
      return "user-input";
    } else if (lowerTagName.includes("error")) {
      return "error";
    } else if (lowerTagName.includes("output")) {
      return "output";
    }
    return "state";
  }

  /**
   * Creates a base element from a JSX node
   */
  static createBaseElement(
    node: JsxElement | JsxSelfClosingElement,
    attributes: Record<string, string>,
    children: SerializedBaseElement[] = []
  ): SerializedBaseElement {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    const tagNameNode = openingElement.getTagNameNode();
    const tagName = tagNameNode.getText();

    if (!tagName) {
      throw new Error("Missing element tag name");
    }

    const id = attributes.id || uuidv4();
    const key = attributes.key || id;
    const elementType = tagName as ElementType;
    const role = this.determineRole(tagName);

    // Create a stub schema that satisfies the ZodType interface
    const schema = this.createStubSchema(tagName, attributes);

    // Get approximate position information
    const startPos = node.getPos();
    const endPos = node.getEnd();

    return {
      id,
      key,
      tag: tagName,
      role,
      elementType,
      attributes,
      children: children,
      parent: undefined,
      allowedChildren: "any",
      type: "element",
      lineStart: 1, // Default values since we can't get exact line/column
      lineEnd: 1,
      columnStart: startPos,
      columnEnd: endPos,
      schema: this.createStubSchema(tagName, attributes),
      onExecutionGraphConstruction: (buildContext: BuildContext) => ({
        id,
        key,
        type: role,
        subType: elementType,
        attributes,
      }),
    } as SerializedBaseElement;
  }

  /**
   * Creates a stub schema for testing purposes
   */
  private static createStubSchema(
    tagName: string,
    attributes: Record<string, string>
  ): z.ZodType<any> {
    // Initialize with a base schema
    let baseSchema = z.object({
      id: z.string(),
      tag: z.string(),
    });

    // Add all attributes from the element to the schema
    Object.keys(attributes).forEach((attrName) => {
      // This is a workaround since we can't dynamically extend the schema
      // We're creating a new object that includes the previous schema + new property
      baseSchema = z.object({
        ...baseSchema.shape,
        [attrName]: z.string().optional(),
      });
    });

    return baseSchema;
  }
}
