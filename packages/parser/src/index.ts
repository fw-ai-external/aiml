import { IBaseElement } from "@fireworks/types";
import { AIMLParseError, AIMLParseContext } from "./types";
import MagicString from "magic-string";

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
  processed: AIMLFile | null;
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

      // Create a MagicString instance for source mapping
      const s = new MagicString(basicFile.content);

      // Move comments that might exist before the imports to just after the imports
      // e.g. {/* this is a comment */}
      const preImportComments = this._splitPreImportComments(basicFile.content);

      // Split all imports from the content
      const imports = this._splitImports(basicFile.content);

      // Find the position after the last import
      const lastImport = imports[imports.length - 1];
      const importEndPos = lastImport
        ? basicFile.content.indexOf(lastImport) + lastImport.length
        : 0;

      // Get content without imports
      const contentWithoutImports = basicFile.content.substring(importEndPos);

      // Build the wrapped content using MagicString
      // First, add the imports
      let wrappedContent = "";
      if (imports.length > 0 && imports[0] !== "") {
        wrappedContent = imports.join("\n") + "\n\n";
      }

      // Then add the wrapper function and JSX fragment
      wrappedContent += `export default function () { \n  return <>\n    ${preImportComments.join("\n")}\n`;

      // Add the actual content
      wrappedContent += contentWithoutImports;

      // Close the JSX fragment and function
      wrappedContent += `\n  </> \n}`;

      // Validate the JSX syntax
      try {
        // Simple validation - check for matching tags
        const openTags =
          wrappedContent.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g) || [];
        const closeTags =
          wrappedContent.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g) || [];

        // Check for mismatched tags
        for (const openTag of openTags) {
          const tagName = openTag.match(/<([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
          if (tagName && !openTag.endsWith("/>")) {
            const closeTag = `</${tagName}>`;
            if (!closeTags.some((tag) => tag === closeTag)) {
              throw new Error(`Missing closing tag for ${openTag}`);
            }
          }
        }
      } catch (validationError) {
        // Add validation error
        const AIMLError = new AIMLParseError(
          validationError instanceof Error
            ? validationError.message
            : String(validationError)
        );
        this.errors.push(AIMLError);
      }

      // Generate the sourcemap
      const map = new MagicString(wrappedContent).generateMap({
        source: filePath || "input.mdx",
        includeContent: true,
        hires: true,
      });

      // If there are validation errors, return with errors but still include the parsed content
      if (this.errors.length > 0) {
        return {
          original: input,
          sourcemap: map.toString(),
          processed: {
            ...basicFile,
            content: wrappedContent,
          },
          ast: null,
          errors: this.errors,
        };
      }

      return {
        original: input,
        sourcemap: map.toString(),
        processed: {
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
        processed: null,
      };
    }
  }

  public getOriginalLineOfCode(
    sourceMap: string,
    line: number,
    column: number
  ): { line: number; column: number; source: string } {
    // Parse the source map
    const map = JSON.parse(sourceMap);

    // Use the source map to find the original position
    // This is a simplified implementation
    return {
      line: line,
      column: column,
      source: map.sources[0] || "",
    };
  }

  public _getGeneratedLineOfCodeFromSourceLine(
    sourceMap: string,
    line: number,
    column: number
  ): { line: number; column: number } {
    // Parse the source map
    const map = JSON.parse(sourceMap);

    // Use the source map to find the generated position
    // This is a simplified implementation
    return {
      line: line,
      column: column,
    };
  }

  public compile(filePAth: string) {
    const file = this.files.get(filePAth);

    if (!file) {
      throw new Error(`File ${filePAth} not found`);
    }

    if (!file.processed) {
      throw new Error(`File ${filePAth} not parsed ${file.errors}`);
    }

    // Create the source file in the TS project now that it is cleaned up
    const sourceFile = this.project.createSourceFile(
      filePAth,
      file.processed?.content || "",
      {
        overwrite: true,
      }
    );

    // this._validateSyntax(sourceFile);

    // const ast = this._parseJSXTree(sourceFile);

    const ast = sourceFile.getChildren();

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

  public _createAST(filePAth: string) {
    const file = this.files.get(filePAth);

    if (!file) {
      throw new Error(`File ${filePAth} not found`);
    }

    if (!file.processed) {
      throw new Error(`File ${filePAth} not parsed ${file.errors}`);
    }

    // Create the source file in the TS project now that it is cleaned up
    const sourceFile = this.project.createSourceFile(
      filePAth,
      file.processed?.content || "",
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

  /**
   * Extracts comments that appear before imports
   */
  private _splitPreImportComments(content: string): string[] {
    const commentRegex = /\{\/\*.*?\*\/\}/g;
    const importRegex = /import\s+.*?from\s+['"].*?['"]/g;

    // Find the position of the first import
    const firstImportMatch = importRegex.exec(content);
    if (!firstImportMatch) return [];

    const firstImportPos = firstImportMatch.index;
    const preImportContent = content.substring(0, firstImportPos);

    // Extract comments from the pre-import content
    const comments: string[] = [];
    let match;
    while ((match = commentRegex.exec(preImportContent)) !== null) {
      comments.push(match[0]);
    }

    return comments;
  }

  /**
   * Extracts import statements from content
   */
  private _splitImports(content: string): string[] {
    const importRegex = /import\s+.*?from\s+['"].*?['"]\s*;?/g;
    const imports: string[] = [];

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[0]);
    }

    return imports.length > 0 ? imports : [""];
  }
}
