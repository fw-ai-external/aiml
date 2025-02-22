import { Project, Node, SourceFile, JsxElement } from "ts-morph";
import type {
  SCXMLNodeType,
  IBaseElement,
  ElementRole,
} from "@fireworks/types";
import {
  MDXParseContext,
  MDXParseError,
  MDXParseResult,
  MDXParserOptions,
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { BaseElement } from "./BaseElement";
import type { Element as XMLElement } from "xml-js";
import { z } from "zod";

export class MDXParser {
  private project: Project;
  private errors: MDXParseError[] = [];
  private options: Required<MDXParserOptions>;
  private sourceFile: SourceFile;

  constructor(sourceCode: string) {
    this.project = new Project({
      useInMemoryFileSystem: true,
      skipFileDependencyResolution: true,
    });
    this.sourceFile = this.project.createSourceFile("temp.tsx", sourceCode);
    this.options = {
      strict: true,
      validateSchema: true,
    };
  }

  parse(input: string): MDXParseResult {
    this.errors = [];
    const sourceFile = this.project.createSourceFile("temp.mdx", input);
    const ast = this.parseMDX(sourceFile);

    return {
      ast,
      errors: this.errors,
    };
  }

  private parseMDX(sourceFile: SourceFile): IBaseElement {
    const context: MDXParseContext = {
      sourceFile,
      currentNode: sourceFile,
      errors: this.errors,
      parents: [],
    };

    // Find the root JSX element
    const jsxElement = sourceFile
      .getDescendants()
      .find((node): node is JsxElement => Node.isJsxElement(node));

    if (!jsxElement) {
      this.addError({
        message: "No JSX element found in MDX file",
        line: 1,
        column: 1,
        code: "no_jsx_root",
      });
      throw new Error("No JSX element found in MDX file");
    }

    return this.parseJsxElement(jsxElement, context);
  }

  private parseJsxElement(
    node: JsxElement,
    context: MDXParseContext
  ): IBaseElement {
    const openingElement = node.getOpeningElement();

    if (!openingElement) {
      this.addError({
        message: "Invalid JSX element structure",
        line: node.getStartLineNumber(),
        column: node.getStart(),
        code: "invalid_jsx",
      });
      throw new Error("Invalid JSX element structure");
    }

    const tagName = openingElement.getTagNameNode().getText();

    if (!tagName) {
      this.addError({
        message: "Missing element tag name",
        line: openingElement.getStartLineNumber(),
        column: openingElement.getStart(),
        code: "missing_tag",
      });
      throw new Error("Missing element tag name");
    }

    // Parse attributes
    const attributes: Record<string, string> = {};
    openingElement.getAttributes().forEach((attr) => {
      if (Node.isJsxAttribute(attr)) {
        const name = attr.getNameNode().getText();
        const initializer = attr.getInitializer();
        if (initializer && Node.isStringLiteral(initializer)) {
          attributes[name] = initializer.getText().replace(/['"]/g, "");
        }
      }
    });

    // Parse children
    const children: IBaseElement[] = [];
    node.getJsxChildren().forEach((child) => {
      if (Node.isJsxElement(child)) {
        children.push(this.parseJsxElement(child, context));
      } else if (Node.isJsxText(child)) {
        const text = child.getText().trim();
        if (text) {
          // Handle text nodes if needed
        }
      }
    });

    // Create BaseElement instance
    const id = attributes.id || uuidv4();
    const key = attributes.key || id;
    const elementType = tagName as SCXMLNodeType;

    // Determine role based on tag name
    let role: "state" | "action" | "user-input" | "error" | "output" = "state";
    if (tagName.toLowerCase().includes("action")) {
      role = "action";
    } else if (tagName.toLowerCase().includes("input")) {
      role = "user-input";
    } else if (tagName.toLowerCase().includes("error")) {
      role = "error";
    } else if (tagName.toLowerCase().includes("output")) {
      role = "output";
    }

    return new BaseElement({
      id,
      key,
      tag: tagName,
      role,
      elementType,
      attributes,
      children,
      parent: context.parents[context.parents.length - 1],
      allowedChildren: "any",
      schema: z.object({}),
    });
  }

  private addError(error: MDXParseError): void {
    this.errors.push(error);
    if (this.options.strict) {
      throw new Error(
        `[${error.code}] ${error.message} at line ${error.line}, column ${error.column}`
      );
    }
  }

  private createElementFromNode(
    node: JsxElement,
    context: MDXParseContext
  ): IBaseElement {
    const id = uuidv4();
    const key = uuidv4();
    const role: ElementRole = "state";
    const tagName = node.getOpeningElement().getTagNameNode().getText();

    return new BaseElement({
      id,
      key,
      tag: tagName,
      role,
      elementType: tagName as SCXMLNodeType,
      attributes: this.getNodeAttributes(node),
      children: [],
      parent: context.parents[context.parents.length - 1],
      allowedChildren: "any",
      schema: z.object({}),
    });
  }

  private getNodeAttributes(node: JsxElement): Record<string, string> {
    const attributes: Record<string, string> = {};
    const openingElement = node.getOpeningElement();

    openingElement.getAttributes().forEach((attr) => {
      if (Node.isJsxAttribute(attr)) {
        const name = attr.getNameNode().getText();
        const initializer = attr.getInitializer();
        if (initializer && Node.isStringLiteral(initializer)) {
          attributes[name] = initializer.getText().slice(1, -1); // Remove quotes
        }
      }
    });

    return attributes;
  }
}

export function parseNode(
  node: Node,
  context: MDXParseContext
): IBaseElement | undefined {
  if (Node.isJsxElement(node)) {
    const parser = new MDXParser(node.getText());
    return parser.parse(node.getText()).ast;
  }
  return undefined;
}

function createElementFromNode(
  node: XMLElement,
  context: MDXParseContext
): IBaseElement {
  const attributes = node.attributes || {};
  const id = String(attributes.id || attributes.key || uuidv4());
  const key = String(attributes.key || attributes.id || uuidv4());
  const role: ElementRole = "state";

  return new BaseElement({
    id,
    key,
    tag: node.name as string,
    role,
    elementType: node.name as SCXMLNodeType,
    attributes,
    children: [],
    parent: context.parents[context.parents.length - 1],
    allowedChildren: "any",
    schema: z.object({}),
  });
}
