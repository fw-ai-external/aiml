import { IBaseElement } from "@fireworks/types";
import { AIMLParseError, AIMLParseContext } from "./types";
// @ts-expect-error no types
import { generator, consumer } from "js-sourcemap";

import {
  SourceFile,
  Node,
  JsxElement,
  JsxSelfClosingElement,
  Project,
} from "ts-morph";
import { ElementBuilder } from "./utils/element-builder";
import { CompilerConfig } from "./utils/compiler-config";
import { isAIMLElement } from "@fireworks/types";
import { AIMLFile, parseMDXFrontmatter } from "./utils/frontmater";

type ProcessedAIMLFile = {
  original: string;
  errors: AIMLParseError[];
  sourcemap: string | null;
  parsed: AIMLFile | null;
  ast: IBaseElement | null;
};

/**
 * AimlParser extends the base MDXParser to provide AIML-specific functionality
 * It focuses on correctly identifying AIML elements and handling both
 * workflow and non-workflow mode
 */
export class AimlParser {
  private errors: AIMLParseError[] = [];
  private project: Project;

  private files: Map<string, ProcessedAIMLFile> = new Map();

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      // skipFileDependencyResolution: true,
      compilerOptions: CompilerConfig.getDefaultOptions(),
    });

    this.errors = [];
  }

  public setFile(
    file: { path: string; content: string },
    process = false
  ): void {
    this.files.set(file.path, this._preProcessFile(file.path, file.content));
    // return this.project.createSourceFile(file.path, file.content, {
    //   overwrite: true,
    //   scriptKind: ScriptKind.TSX,
    // });
  }

  /**
   * Parses AIML content and determines its mode (workflow or non-workflow)
   */
  public _preProcessFile(filePath: string, input: string): ProcessedAIMLFile {
    this.errors = [];

    try {
      // Extract frontmatter header if present
      const basicFile = parseMDXFrontmatter(input);

      // Move comments that might exist before the imports to just after the imports
      const preImportComments = this._splitPreImportComments(basicFile.content);

      //Split all imports from the content
      const imports = this._splitImports(basicFile.content);
      const contentWithoutImports = basicFile.content.split(
        imports[imports.length - 1]
      )[1];

      // Wrap the MDX content in a JSX fragment to make it parseable by ts-morph
      // This ensures the content is valid TypeScript/JSX that ts-morph can process
      const wrappedContent = `${imports.join("\n")}

export default function () { 
  return <>
    ${preImportComments.join("\n")}
    ${contentWithoutImports}
  </> 
}`;

      return {
        original: input,
        sourcemap: this.createSourceMap(input, wrappedContent, filePath),
        parsed: {
          ...basicFile,
          content: wrappedContent,
        },
        ast: null,
        errors: [],
      };
    } catch (error) {
      console.error("Error in parse:", error);
      // Collect the error instead of throwing
      if (error instanceof Error) {
        const AIMLError = new AIMLParseError(error.message);
        this.errors.push(AIMLError);
      } else {
        const AIMLError = new AIMLParseError("Unknown error during parsing");
        this.errors.push(AIMLError);
      }

      return {
        ast: null,
        errors: this.errors,
        original: input,
        sourcemap: null,
        parsed: null,
      };
    }
  }

  // Splits out all MDX style comments from the content before the imports
  // e.g. {/* this is a comment */}
  public _splitPreImportComments(content: string): string[] {
    // Split the content by the imports
    const imports = this._splitImports(content);
    if (!imports[0]) {
      return [];
    }
    const preImportComments = content.split(imports[0])[0];
    const commentRegex = /{[\s\S]*?}/g;
    return preImportComments.match(commentRegex) || [];
  }

  // Splits out all imports from the content
  public _splitImports(content: string): string[] {
    const importRegex = /import\s+[\s\S]*?from\s+['"][\s\S]*?['"];?/g;
    return content.match(importRegex) || [];
  }

  private createSourceMap(
    source: string,
    target: string,
    fileName: string
  ): string {
    return generator(source, target, fileName);
  }

  public getOriginalLineOfCode(
    sourceMap: string,
    line: number,
    column: number
  ): { line: number; column: number; source: string } {
    const c = consumer(sourceMap);
    const originalLine = c.originalPositionFor({
      line,
      column,
    });

    return {
      line: originalLine.line,
      column: originalLine.column,
      source: originalLine.source,
    };
  }

  public _getGeneratedLineOfCodeFromSourceLine(
    sourceMap: string,
    line: number,
    column: number
  ): { line: number; column: number } {
    const c = consumer(sourceMap);
    const generatedLine = c.generatedPositionFor({
      line,
      column,
    });

    return {
      line: generatedLine.line,
      column: generatedLine.column,
    };
  }

  public _createAST(filePAth: string) {
    const file = this.files.get(filePAth);

    if (!file) {
      throw new Error(`File ${filePAth} not found`);
    }

    if (!file.parsed) {
      throw new Error(`File ${filePAth} not parsed ${file.errors}`);
    }

    // Create the source file in the TS project now that it is cleaned up
    const sourceFile = this.project.createSourceFile(
      filePAth,
      file.parsed?.content || "",
      {
        overwrite: true,
      }
    );

    this._validateSyntax(sourceFile);

    const ast = this._parseJSXTree(sourceFile);

    // If parseJSXTree returned null due to an error, return early with errors
    if (ast === null) {
      return {
        ast: null,
        errors: this.errors,
      };
    }

    // TODO: Attach frontmatter to the AST

    return {
      ast,
      errors: this.errors,
    };
  }

  public _validateSyntax(sourceFile: SourceFile): void {
    try {
      // Check syntax using ts-morph's diagnostics
      const diagnostics = sourceFile.getPreEmitDiagnostics();
      const diagnosticsArray = Array.isArray(diagnostics) ? diagnostics : [];

      // Get diagnostic filters
      const diagnosticFilters = CompilerConfig.getDiagnosticFilters();

      const syntaxDiagnostics = diagnosticsArray.filter((d) => {
        if (!d || typeof d.getMessageText !== "function") {
          return false;
        }

        const message = d.getMessageText();
        const messageText =
          typeof message === "string" ? message : message.getMessageText();

        // Skip diagnostics that match our filters
        return !diagnosticFilters.some((filter: string) => {
          if (typeof filter === "string") {
            return messageText.includes(filter);
          }
          return false;
        });
      });

      // Ensure errors is always an array before using array methods
      if (!this.errors) {
        this.errors = [];
      }

      // Collect diagnostics as structured errors instead of throwing
      if (syntaxDiagnostics.length > 0) {
        // Add all diagnostics to the errors array
        syntaxDiagnostics.forEach((diagnostic) => {
          const message = diagnostic.getMessageText();
          const messageStr =
            typeof message === "string" ? message : message.getMessageText();

          const line = diagnostic.getLineNumber() || 1;
          const column = diagnostic.getStart() || 1;

          const AIMLError = new AIMLParseError(messageStr, line, column);
          this.errors.push(AIMLError);
        });

        // Don't throw, just collect the errors
      }
    } catch (error) {
      // Handle unexpected errors during validation
      // Ensure errors is always an array before using array methods
      if (!this.errors) {
        this.errors = [];
      }

      const AIMLError = new AIMLParseError(
        error instanceof Error ? error.message : String(error)
      );
      this.errors.push(AIMLError);
    }
  }

  public _parseJSXTree(sourceFile: SourceFile): IBaseElement | null {
    // Ensure errors is always an array
    if (!this.errors) {
      this.errors = [];
    }

    const context: AIMLParseContext = {
      sourceFile,
      currentNode: sourceFile,
      errors: this.errors,
      parents: [],
    };

    try {
      const jsxNode = this._findRootJSXElement(sourceFile);

      // Handle the case where no JSX element was found
      if (jsxNode === null) {
        return null;
      }

      return this._parseJSXNode(jsxNode, context);
    } catch (error) {
      if (error instanceof Error) {
        const AIMLError = new AIMLParseError(
          error.message,
          sourceFile.getStartLineNumber(),
          sourceFile.getStart()
        );
        this.errors.push(AIMLError);
        // Return null instead of throwing
        return null;
      }
      // For unknown errors, still add to errors collection
      const AIMLError = new AIMLParseError(
        "Unknown error during parsing",
        sourceFile.getStartLineNumber(),
        sourceFile.getStart()
      );
      this.errors.push(AIMLError);
      return null;
    }
  }

  public _findRootJSXElement(
    sourceFile: SourceFile
  ): JsxElement | JsxSelfClosingElement | null {
    // AIML files can be in either workflow mode or non-workflow mode
    // In non-workflow mode, the top-level element would be a state, parallel, or final element
    // Try to find any top-level AIML element (workflow, state, parallel, final)
    const aimlTopLevelElements = ["workflow", "state", "parallel", "final"];

    let jsxNode = sourceFile.getFirstDescendant(
      (node): node is JsxElement | JsxSelfClosingElement => {
        if (Node.isJsxElement(node)) {
          const tagName = node
            .getOpeningElement()
            .getTagNameNode()
            .getText()
            .toLowerCase();
          return aimlTopLevelElements.includes(tagName);
        }
        if (Node.isJsxSelfClosingElement(node)) {
          const tagName = node.getTagNameNode().getText().toLowerCase();
          return aimlTopLevelElements.includes(tagName);
        }
        return false;
      }
    );

    // If still not found, fall back to any JSX element
    if (!jsxNode) {
      jsxNode = sourceFile.getFirstDescendant(
        (node): node is JsxElement | JsxSelfClosingElement =>
          Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)
      );
    }

    // If still not found, try to find any JSX fragment
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
      // Instead of throwing, add to errors and return null
      const AIMLError = new AIMLParseError("No JSX element found in AIML file");
      this.errors.push(AIMLError);
      return null;
    }

    return jsxNode;
  }

  public _parseJSXNode(
    node: JsxElement | JsxSelfClosingElement,
    context: AIMLParseContext
  ): IBaseElement | null {
    try {
      const openingElement = Node.isJsxElement(node)
        ? node.getOpeningElement()
        : node;

      const tagNameNode = openingElement.getTagNameNode();
      const tagName = tagNameNode.getText();

      // Look for AIML elements first
      if (Node.isJsxElement(node)) {
        // Check if this is a recognized AIML element

        const lowerTagName = tagName.toLowerCase();
        if (isAIMLElement(lowerTagName)) {
          // Process this AIML element directly
        } else {
          // Look for AIML elements in children
          const childNodes = node.getJsxChildren();
          for (const child of childNodes) {
            if (Node.isJsxElement(child)) {
              const childTagName = child
                .getOpeningElement()
                .getTagNameNode()
                .getText()
                .toLowerCase();
              if (isAIMLElement(childTagName)) {
                // Found an AIML element, process it instead
                return this._parseJSXNode(child, context);
              }
            } else if (Node.isJsxSelfClosingElement(child)) {
              const childTagName = child
                .getTagNameNode()
                .getText()
                .toLowerCase();
              if (isAIMLElement(childTagName)) {
                // Found an AIML element, process it instead
                return this._parseJSXNode(child, context);
              }
            }
          }
        }
      }

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
            const childElement = this._parseJSXNode(child, childContext);
            if (childElement !== null) {
              children.push(childElement);
            }
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
      // Ensure errors is always an array before using array methods
      if (!this.errors) {
        this.errors = [];
      }

      if (error instanceof Error) {
        const AIMLError = new AIMLParseError(
          error.message,
          node.getStartLineNumber(),
          node.getStart()
        );
        this.errors.push(AIMLError);
        // Return null instead of throwing
        return null;
      }
      // For unknown errors, add to errors collection
      const AIMLError = new AIMLParseError(
        "Unknown error during parsing",
        node.getStartLineNumber(),
        node.getStart()
      );
      this.errors.push(AIMLError);
      return null;
    }
  }
}
