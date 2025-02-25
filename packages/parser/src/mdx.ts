import { JSXPreprocessor } from "./utils/jsx-preprocessor";
import { BaseElement } from "./BaseElement";
import { ElementBuilder } from "./utils/element-builder";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { SCXMLNodeType } from "@fireworks/types";
import { xml2js } from "xml-js";

export interface MDXParseResult {
  ast: BaseElement;
  errors: Error[];
}

/**
 * MDX Parser for AIML files
 * Converts MDX to an AST of BaseElement objects
 */
export class MDXParser {
  private source: string;
  private errors: Error[] = [];

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Extract the tag name from a JSX/MDX element string
   * @param source The source string containing a JSX element
   * @returns The tag name of the element
   */
  protected extractTagName(source: string): string {
    const match = source.match(/<([a-zA-Z][a-zA-Z0-9]*)/);
    if (!match) {
      throw new Error("No valid tag found in source");
    }
    return match[1];
  }

  /**
   * Extract the ID attribute from a JSX/MDX element string
   * @param source The source string containing a JSX element
   * @returns The ID value, or a generated UUID if not found
   */
  protected extractId(source: string): string {
    const idMatch = source.match(/id=["']([^"']*)["']/);
    return idMatch ? idMatch[1] : uuidv4();
  }

  /**
   * Extract all attributes from a JSX/MDX element string
   * @param source The source string containing a JSX element
   * @returns A record of attribute name-value pairs
   */
  protected extractAttributes(source: string): Record<string, string> {
    const attributes: Record<string, string> = {};

    // Match all attribute pairs in the format name="value" or name='value'
    const attrRegex = /([a-zA-Z][a-zA-Z0-9]*)=["']([^"']*)["']/g;
    let match;

    while ((match = attrRegex.exec(source)) !== null) {
      attributes[match[1]] = match[2];
    }

    // Ensure ID exists
    if (!attributes.id) {
      attributes.id = uuidv4();
    }

    return attributes;
  }

  /**
   * Extract child elements from a JSX/MDX element string
   * @param source The source string containing a JSX element
   * @returns An array of BaseElement objects representing the children
   */
  protected extractChildren(source: string): BaseElement[] {
    const children: BaseElement[] = [];

    // Simple pattern to find child elements, assumes well-formed XML
    const openingTag = this.extractTagName(source);
    const content = source.match(
      new RegExp(`<${openingTag}[^>]*>(.*)</${openingTag}>`, "s")
    );

    if (!content || !content[1].trim()) {
      return children;
    }

    // Simple pattern to match child tags - this is a basic implementation
    // A more robust solution would use proper XML/JSX parsing
    const childTagRegex = /<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    let childMatch;

    const childTags: string[] = [];
    while ((childMatch = childTagRegex.exec(content[1])) !== null) {
      childTags.push(childMatch[1]);
    }

    // Create BaseElement for each unique child tag
    // This is simplified and doesn't handle complex nesting
    const uniqueTags = [...new Set(childTags)];
    for (const tag of uniqueTags) {
      children.push(
        new BaseElement({
          id: uuidv4(),
          key: uuidv4(),
          tag,
          role: ElementBuilder.determineRole(tag),
          elementType: "state" as SCXMLNodeType,
          attributes: {},
          children: [],
          parent: undefined,
          allowedChildren: "any",
          schema: z.object({}) as z.ZodType<any>,
          propsSchema: {},
        })
      );
    }

    return children;
  }

  /**
   * Parse MDX content to an AST
   * @param source Optional source to parse (will use constructor source if not provided)
   * @returns Parse result containing AST and any errors
   */
  parse(source?: string): MDXParseResult {
    this.errors = [];
    const mdxSource = source || this.source;

    try {
      // Validate and preprocess the MDX input
      const processed = JSXPreprocessor.validateAndPreprocess(mdxSource);

      // Use xml2js to convert the JSX/MDX content to an XML object
      const xmlObj = xml2js(processed, { compact: false });
      if (!xmlObj.elements || xmlObj.elements.length === 0) {
        throw new Error("No XML elements found");
      }

      // Convert the first XML element (assumed to be the root) into a BaseElement AST
      const rootXml = xmlObj.elements[0];
      const ast = this.convertXmlElement(rootXml);

      return {
        ast,
        errors: this.errors,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.errors.push(error);
        throw error;
      }
      throw new Error("Unknown error during MDX parsing");
    }
  }

  // Recursively converts an XML element from xml2js into a BaseElement
  protected convertXmlElement(xmlElement: any): BaseElement {
    // Extract tag name
    const tag = xmlElement.name;

    // Extract attributes
    const attributes: Record<string, string> = xmlElement.attributes || {};
    if (!attributes.id) {
      attributes.id = uuidv4();
    }

    // Process children: Only process sub-elements of type 'element'
    const children: BaseElement[] = (xmlElement.elements || [])
      .filter((el: any) => el.type === "element")
      .map((el: any) => this.convertXmlElement(el));

    return this.createBasicElement(tag, attributes, children);
  }

  /**
   * Helper to create basic elements based on tag name and attributes
   */
  private createBasicElement(
    tagName: string,
    attributes: Record<string, string> = {},
    children: BaseElement[] = []
  ): BaseElement {
    const id = attributes.id || uuidv4();
    const key = attributes.key || id;
    const role = ElementBuilder.determineRole(tagName);

    return new BaseElement({
      id,
      key,
      tag: tagName,
      role,
      elementType: "state" as SCXMLNodeType,
      attributes,
      children,
      parent: undefined,
      allowedChildren: "any",
      schema: z.object({}) as z.ZodType<any>,
      propsSchema: {},
    });
  }
}
