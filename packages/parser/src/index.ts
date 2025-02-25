import {
  Project,
  Node,
  SourceFile,
  JsxElement,
  JsxSelfClosingElement,
  DiagnosticMessageChain,
  ScriptKind,
} from "ts-morph";
import type { IBaseElement } from "@fireworks/types";
import {
  MDXParseContext,
  MDXParseError,
  MDXParseResult,
  MDXParserOptions,
} from "./types";

import { JSXPreprocessor } from "./utils/jsx-preprocessor";
import { ElementBuilder } from "./utils/element-builder";
import { CompilerConfig } from "./utils/compiler-config";

export class MDXParser {
  private project: Project;
  private errors: MDXParseError[] = [];
  private options: Required<MDXParserOptions>;

  constructor(sourceCode?: string) {
    this.project = new Project({
      useInMemoryFileSystem: true,
      skipFileDependencyResolution: true,
      compilerOptions: CompilerConfig.getDefaultOptions(),
    });
    this.options = {
      strict: true,
      validateSchema: true,
    };
  }

  parse(input: string): MDXParseResult {
    this.errors = [];

    try {
      console.log("Processing input:", input);
      const processedInput = JSXPreprocessor.process(input);
      console.log("Processed input:", processedInput);

      const sourceFile = this.createSourceFile(processedInput);
      console.log("Source file created");

      this.validateSyntax(sourceFile);
      console.log("Syntax validated");

      const ast = this.parseJSXTree(sourceFile);
      console.log("AST parsed successfully");

      return {
        ast,
        errors: this.errors,
      };
    } catch (error) {
      console.error("Error in parse:", error);
      if (error instanceof Error) {
        const mdxError = new MDXParseError(error.message);
        this.errors.push(mdxError);
        throw mdxError;
      }
      throw error;
    }
  }

  private createSourceFile(input: string): SourceFile {
    return this.project.createSourceFile("temp.tsx", input, {
      overwrite: true,
      scriptKind: ScriptKind.TSX,
    });
  }

  private validateSyntax(sourceFile: SourceFile): void {
    const diagnosticFilters = CompilerConfig.getDiagnosticFilters();
    const syntaxDiagnostics = sourceFile.getPreEmitDiagnostics().filter((d) => {
      const message = d.getMessageText().toString();
      return !diagnosticFilters.some((filter) => message.includes(filter));
    });

    if (syntaxDiagnostics.length > 0) {
      const error = syntaxDiagnostics[0];
      const messageText = error.getMessageText();
      const message =
        typeof messageText === "string"
          ? messageText
          : (messageText as DiagnosticMessageChain).getMessageText();
      throw new MDXParseError(
        message,
        error.getLineNumber() || 1,
        error.getStart() || 1
      );
    }
  }

  private parseJSXTree(sourceFile: SourceFile): IBaseElement {
    const context: MDXParseContext = {
      sourceFile,
      currentNode: sourceFile,
      errors: this.errors,
      parents: [],
    };

    try {
      const jsxNode = this.findRootJSXElement(sourceFile);
      return this.parseJSXNode(jsxNode, context);
    } catch (error) {
      if (error instanceof Error) {
        const mdxError = new MDXParseError(
          error.message,
          sourceFile.getStartLineNumber(),
          sourceFile.getStart()
        );
        this.errors.push(mdxError);
        throw mdxError;
      }
      throw error;
    }
  }

  private findRootJSXElement(
    sourceFile: SourceFile
  ): JsxElement | JsxSelfClosingElement {
    // First try to find a regular JSX element
    let jsxNode = sourceFile.getFirstDescendant(
      (node): node is JsxElement | JsxSelfClosingElement =>
        Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)
    );

    // If not found, try to find any JSX fragment
    if (!jsxNode) {
      jsxNode = sourceFile.getFirstDescendant(
        (node): node is JsxElement | JsxSelfClosingElement =>
          Node.isJsxFragment(node)
      ) as JsxElement | JsxSelfClosingElement | undefined;
    }

    // If still not found, check if there are any JSX expressions that might contain elements
    if (!jsxNode) {
      const jsxExpression = sourceFile.getFirstDescendant((node) =>
        Node.isJsxExpression(node)
      );

      if (jsxExpression) {
        // Try to find JSX elements within the expression
        jsxNode = jsxExpression.getFirstDescendant(
          (node): node is JsxElement | JsxSelfClosingElement =>
            Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)
        );
      }
    }

    if (!jsxNode) {
      throw new MDXParseError("No JSX element found in MDX file");
    }

    return jsxNode;
  }

  private parseJSXNode(
    node: JsxElement | JsxSelfClosingElement,
    context: MDXParseContext
  ): IBaseElement {
    try {
      const openingElement = Node.isJsxElement(node)
        ? node.getOpeningElement()
        : node;

      const attributes = ElementBuilder.parseAttributes(
        openingElement.getAttributes().filter(Node.isJsxAttribute)
      );

      const children: IBaseElement[] = [];
      if (Node.isJsxElement(node)) {
        const childNodes = node.getJsxChildren();
        childNodes.forEach((child) => {
          if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
            const childContext = {
              ...context,
              parents: [...context.parents],
            };
            const childElement = this.parseJSXNode(child, childContext);
            children.push(childElement);
          }
          // Text nodes are handled by the JSX runtime
        });
      }

      // Create the base element first
      const element = ElementBuilder.createBaseElement(
        node,
        attributes,
        children
      );

      // Then set parent relationships after element creation
      if (children.length > 0) {
        children.forEach((childElement) => {
          // Set the parent property using TypeScript casting to overcome readonly restrictions
          (childElement as any).parent = element;
        });
      }

      return element;
    } catch (error) {
      if (error instanceof Error) {
        const mdxError = new MDXParseError(
          error.message,
          node.getStartLineNumber(),
          node.getStart()
        );
        this.errors.push(mdxError);
        throw mdxError;
      }
      throw error;
    }
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
