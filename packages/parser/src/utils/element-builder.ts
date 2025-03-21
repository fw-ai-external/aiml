import type { ElementRole, SerializedBaseElement } from '@fireworks/shared';
import { type JsxAttributeLike, type JsxElement, type JsxSelfClosingElement, Node } from 'ts-morph';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export class ElementBuilder {
  /**
   * Creates a serialized base element from a JSX element
   */
  static createBaseElement(
    element: JsxSelfClosingElement | JsxElement,
    attributes: Record<string, string>,
    children: SerializedBaseElement[] = [],
  ): SerializedBaseElement {
    const tagName = Node.isJsxSelfClosingElement(element)
      ? element.getTagNameNode().getText()
      : element.getOpeningElement().getTagNameNode().getText();

    const role = this.determineRole(tagName);

    // Generate a UUID if no id is provided
    const id = attributes.id || uuidv4();

    return {
      type: 'element',
      id,
      key: `element-${id}`,
      tag: tagName,
      role,
      elementType: tagName.toLowerCase() as any,
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
  static parseAttributes(attributes: JsxAttributeLike[]): Record<string, string> {
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
            result[name] = initializer.getText().replace(/['"]/g, '');
          } else if (Node.isJsxExpression(initializer)) {
            const expression = initializer.getExpression();
            if (expression && Node.isStringLiteral(expression)) {
              result[name] = expression.getText().replace(/['"]/g, '');
            }
          }
        } else {
          // Handle boolean attributes
          result[name] = 'true';
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
    if (lowerTagName.includes('action')) {
      return 'action';
    } else if (lowerTagName.includes('input')) {
      return 'user-input';
    } else if (lowerTagName.includes('error')) {
      return 'error';
    } else if (lowerTagName.includes('output')) {
      return 'output';
    }
    return 'state';
  }

  /**
   * Creates a stub schema for testing purposes
   */
  private static createStubSchema(tagName: string, attributes: Record<string, string>): z.ZodType<any> {
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
