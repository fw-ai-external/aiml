import { SemanticTokensBuilder } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { SemanticTokenTypes, SemanticTokenModifiers } from "./types";
import type { AIMLASTNode } from "./types";
import {
  getElementTokenType,
  getElementModifiersForName,
  getAttributeValueTokenType,
} from "./utils";
import {
  highlightJavaScriptLine,
  highlightPythonLine,
} from "./code-highlighter";

/**
 * Extract tokens from AST nodes
 */
export function extractTokensFromAST(
  ast: AIMLASTNode[],
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  const processedCodeBlocks = new Set<string>();

  for (const node of ast) {
    processASTNode(node, document, builder, processedCodeBlocks);
  }
}

/**
 * Process a single AST node and its children
 */
function processASTNode(
  node: AIMLASTNode,
  document: TextDocument,
  builder: SemanticTokensBuilder,
  processedCodeBlocks: Set<string>
): void {
  try {
    switch (node.type) {
      case "AIMLElement":
        processAIMLElement(node, document, builder, processedCodeBlocks);
        break;
      case "CodeJavascript":
        processCodeBlock(
          node,
          "javascript",
          document,
          builder,
          processedCodeBlocks
        );
        break;
      case "CodePython":
        processCodeBlock(
          node,
          "python",
          document,
          builder,
          processedCodeBlocks
        );
        break;
      case "Comment":
        processComment(node, document, builder);
        break;
      case "Expression":
        processExpression(node, document, builder);
        break;
      case "Text":
        // Text nodes don't need special highlighting
        break;
      default:
        // Process children for other node types
        if (node.children) {
          for (const child of node.children) {
            processASTNode(child, document, builder, processedCodeBlocks);
          }
        }
        break;
    }
  } catch (error) {
    console.error(`Error processing AST node of type ${node.type}:`, error);
  }
}

/**
 * Process AIML element nodes
 */
function processAIMLElement(
  node: AIMLASTNode,
  document: TextDocument,
  builder: SemanticTokensBuilder,
  processedCodeBlocks: Set<string>
): void {
  // Highlight the element tag name
  if (node.attributes) {
    const tagNameAttr = node.attributes.find((attr) => attr.type === "TagName");
    if (tagNameAttr && tagNameAttr.content) {
      const elementName = tagNameAttr.content as string;
      const tokenType = getElementTokenType(elementName);
      const modifiers = getElementModifiersForName(elementName);

      builder.push(
        tagNameAttr.lineStart,
        tagNameAttr.columnStart,
        elementName.length,
        tokenType,
        modifiers
      );
    }

    // Highlight attributes
    for (const attr of node.attributes) {
      if (attr.type === "Prop" && attr.name) {
        // Highlight attribute name
        builder.push(
          attr.lineStart,
          attr.columnStart,
          attr.name.length,
          SemanticTokenTypes.PARAMETER,
          1 << SemanticTokenModifiers.DECLARATION
        );

        // Highlight attribute value
        if (attr.content !== undefined) {
          const valueTokenType = getAttributeValueTokenType(
            attr.name,
            attr.content,
            attr.contentType
          );
          // Calculate value position (approximate)
          const valueStart = attr.columnStart + attr.name.length + 2; // +2 for ="
          const valueLength = String(attr.content).length;

          builder.push(
            attr.lineStart,
            valueStart,
            valueLength,
            valueTokenType,
            0
          );
        }
      }
    }
  }

  // Process children
  if (node.children) {
    for (const child of node.children) {
      processASTNode(child, document, builder, processedCodeBlocks);
    }
  }
}

/**
 * Process code blocks (JavaScript or Python)
 */
function processCodeBlock(
  node: AIMLASTNode,
  language: string,
  document: TextDocument,
  builder: SemanticTokensBuilder,
  processedCodeBlocks: Set<string>
): void {
  if (!node.content || typeof node.content !== "string") return;

  const blockKey = `${node.lineStart}-${node.columnStart}-${language}`;
  if (processedCodeBlocks.has(blockKey)) return;
  processedCodeBlocks.add(blockKey);

  const content = node.content;
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineIndex = node.lineStart + i;

    if (language === "javascript" || language === "typescript") {
      highlightJavaScriptLine(line, lineIndex, builder, node.columnStart);
    } else if (language === "python") {
      highlightPythonLine(line, lineIndex, builder, node.columnStart);
    }
  }
}

/**
 * Process comment nodes
 */
function processComment(
  node: AIMLASTNode,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  if (node.content && typeof node.content === "string") {
    builder.push(
      node.lineStart,
      node.columnStart,
      node.content.length,
      SemanticTokenTypes.COMMENT,
      1 << SemanticTokenModifiers.DOCUMENTATION
    );
  }
}

/**
 * Process expression nodes
 */
function processExpression(
  node: AIMLASTNode,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  if (node.content && typeof node.content === "string") {
    builder.push(
      node.lineStart,
      node.columnStart,
      node.content.length,
      SemanticTokenTypes.PROPERTY,
      1 << SemanticTokenModifiers.DECLARATION
    );
  }
}
