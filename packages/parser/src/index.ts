import {
  Project,
  Node,
  SourceFile,
  JsxElement,
  JsxSelfClosingElement,
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
  private compilerConfig: CompilerConfig = new CompilerConfig();

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

    // If source code is provided, try to extract YAML frontmatter
    if (sourceCode) {
      try {
        this.extractFrontmatter(sourceCode);
      } catch (error) {
        // Silently ignore frontmatter extraction errors
        // They will be caught during the actual parse
      }
    }
  }

  parse(input: string): MDXParseResult {
    this.errors = [];

    try {
      // Extract frontmatter if present
      const frontmatter = this.extractFrontmatter(input);

      // Handle markdown text for non-workflow mode
      let systemPrompt: string | null = null;

      // Extract markdown text that might be present before the first AIML element
      // This is used in non-workflow mode as a system prompt
      const firstElementMatch = input.match(
        /<(workflow|state|parallel|final)[^>]*>/i
      );
      if (
        firstElementMatch &&
        firstElementMatch.index &&
        firstElementMatch.index > 0
      ) {
        // Extract text before the first element, excluding frontmatter
        let textBeforeElement = input
          .substring(0, firstElementMatch.index)
          .trim();

        // Remove frontmatter if present
        if (frontmatter) {
          const frontmatterMatch = textBeforeElement.match(
            /^---\s*\n[\s\S]*?\n---\s*\n/
          );
          if (frontmatterMatch) {
            textBeforeElement = textBeforeElement
              .substring(frontmatterMatch[0].length)
              .trim();
          }
        }

        if (textBeforeElement) {
          systemPrompt = textBeforeElement;
        }
      }

      // Process the input to handle JSX syntax
      const processedInput = JSXPreprocessor.process(input);

      const sourceFile = this.createSourceFile(processedInput);

      this.validateSyntax(sourceFile);

      const ast = this.parseJSXTree(sourceFile);

      // If parseJSXTree returned null due to an error, return early with errors
      if (ast === null) {
        return {
          ast: null as any,
          errors: this.errors,
        };
      }

      // If frontmatter was found, attach it to the AST
      if (frontmatter && Object.keys(frontmatter).length > 0) {
        // Use TypeScript casting to overcome readonly restrictions
        (ast as any).attributes = {
          ...ast.attributes,
          frontmatter,
        };
      }

      // Handle non-workflow mode
      if (ast.tag !== "workflow") {
        // Check if this is a non-workflow AIML file with top-level states
        const topLevelStates = ast.children.filter((child) =>
          ["state", "parallel", "final"].includes(child.tag)
        );

        if (
          topLevelStates.length > 0 ||
          ast.tag === "state" ||
          ast.tag === "parallel" ||
          ast.tag === "final"
        ) {
          // This is a non-workflow mode AIML file
          // If we have a system prompt from markdown text, attach it to the AST
          if (systemPrompt) {
            (ast as any).attributes = {
              ...ast.attributes,
              systemPrompt,
            };
          }
        }
      }

      return {
        ast,
        errors: this.errors,
      };
    } catch (error) {
      console.error("Error in parse:", error);
      // Collect the error instead of throwing
      if (error instanceof Error) {
        const mdxError = new MDXParseError(error.message);
        this.errors.push(mdxError);
      } else {
        const mdxError = new MDXParseError("Unknown error during parsing");
        this.errors.push(mdxError);
      }

      return {
        ast: null as any,
        errors: this.errors,
      };
    }
  }

  private createSourceFile(input: string): SourceFile {
    return this.project.createSourceFile("temp.tsx", input, {
      overwrite: true,
      scriptKind: ScriptKind.TSX,
    });
  }

  private validateSyntax(sourceFile: SourceFile): void {
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

      // Initialize errors array if not already initialized
      if (!Array.isArray(this.errors)) {
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

          const mdxError = new MDXParseError(messageStr, line, column);
          this.errors.push(mdxError);
        });

        // Don't throw, just collect the errors
      }
    } catch (error) {
      // Handle unexpected errors during validation
      if (!Array.isArray(this.errors)) {
        this.errors = [];
      }

      const mdxError = new MDXParseError(
        error instanceof Error ? error.message : String(error)
      );
      this.errors.push(mdxError);
    }
  }

  private parseJSXTree(sourceFile: SourceFile): IBaseElement | null {
    const context: MDXParseContext = {
      sourceFile,
      currentNode: sourceFile,
      errors: this.errors,
      parents: [],
    };

    try {
      const jsxNode = this.findRootJSXElement(sourceFile);

      // Handle the case where no JSX element was found
      if (jsxNode === null) {
        return null;
      }

      return this.parseJSXNode(jsxNode, context);
    } catch (error) {
      if (error instanceof Error) {
        const mdxError = new MDXParseError(
          error.message,
          sourceFile.getStartLineNumber(),
          sourceFile.getStart()
        );
        this.errors.push(mdxError);
        // Return null instead of throwing
        return null;
      }
      // For unknown errors, still add to errors collection
      const mdxError = new MDXParseError(
        "Unknown error during parsing",
        sourceFile.getStartLineNumber(),
        sourceFile.getStart()
      );
      this.errors.push(mdxError);
      return null;
    }
  }

  private findRootJSXElement(
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
      const mdxError = new MDXParseError("No JSX element found in MDX file");
      this.errors.push(mdxError);
      return null;
    }

    return jsxNode;
  }

  private parseJSXNode(
    node: JsxElement | JsxSelfClosingElement,
    context: MDXParseContext
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
        const aimlElements = [
          "workflow",
          "state",
          "parallel",
          "final",
          "datamodel",
          "data",
          "assign",
          "onentry",
          "onexit",
          "transition",
          "if",
          "elseif",
          "else",
          "foreach",
          "script",
          "llm",
          "toolcall",
          "log",
          "sendText",
          "sendToolCalls",
          "sendObject",
          "onerror",
          "onchunk",
          "prompt",
          "instructions",
        ];

        const lowerTagName = tagName.toLowerCase();
        if (aimlElements.includes(lowerTagName)) {
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
              if (aimlElements.includes(childTagName)) {
                // Found an AIML element, process it instead
                return this.parseJSXNode(child, context);
              }
            } else if (Node.isJsxSelfClosingElement(child)) {
              const childTagName = child
                .getTagNameNode()
                .getText()
                .toLowerCase();
              if (aimlElements.includes(childTagName)) {
                // Found an AIML element, process it instead
                return this.parseJSXNode(child, context);
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
            const childElement = this.parseJSXNode(child, childContext);
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
      if (error instanceof Error) {
        const mdxError = new MDXParseError(
          error.message,
          node.getStartLineNumber(),
          node.getStart()
        );
        this.errors.push(mdxError);
        // Return null instead of throwing
        return null;
      }
      // For unknown errors, add to errors collection
      const mdxError = new MDXParseError(
        "Unknown error during parsing",
        node.getStartLineNumber(),
        node.getStart()
      );
      this.errors.push(mdxError);
      return null;
    }
  }

  /**
   * Extracts YAML frontmatter from AIML source code
   * Frontmatter is expected to be at the beginning of the file between --- markers
   */
  private extractFrontmatter(sourceCode: string): Record<string, any> | null {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = sourceCode.match(frontmatterRegex);

    if (!match || !match[1]) {
      return null;
    }

    try {
      // In a real implementation, we would parse the YAML here
      // For now, we'll just return an empty object
      return {};
    } catch (error) {
      return null;
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
