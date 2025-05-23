import {
  SemanticTokensBuilder,
  type SemanticTokens,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { SEMANTIC_TOKEN_LEGEND } from "./types";
import { fallbackToTextBasedParsing } from "./text-parser";

/**
 * Extract semantic tokens from AIML document using AST
 * Enhanced to handle embedded languages in script tags using parser output
 */
export async function extractSemanticTokens(
  document: TextDocument
): Promise<SemanticTokens> {
  const builder = new SemanticTokensBuilder();

  try {
    const text = document.getText();

    // For now, use the text-based fallback as the parser integration is complex
    // TODO: Implement proper AST integration once parser exports are clarified
    fallbackToTextBasedParsing(text, document, builder);
  } catch (error) {
    // More detailed error logging
    console.error(`Semantic highlighting error for ${document.uri}:`, error);
    // Don't propagate the error - return empty tokens instead
    return { data: [] };
  }

  // Safely build tokens even if there was an issue
  try {
    return builder.build();
  } catch (error) {
    console.error("Failed to build semantic tokens:", error);
    return { data: [] };
  }
}

// Export the legend for use by the language server
export { SEMANTIC_TOKEN_LEGEND };

// Export types for external use
export type {
  SemanticTokenTypes,
  SemanticTokenModifiers,
  AIMLASTNode,
  ScriptTagInfo,
} from "./types";

// Export utility functions for external use
export {
  getElementTokenType,
  getElementModifiersForName,
  getAttributeValueTokenType,
  getAttributeValueTokenTypeFromText,
  normalizeLanguage,
  isLineInScriptTag,
} from "./utils";

// Export processing functions for external use
export { extractTokensFromAST } from "./ast-processor";
export {
  fallbackToTextBasedParsing,
  extractScriptTags,
  extractTokensFromText,
} from "./text-parser";
export {
  highlightElements,
  highlightAttributes,
  highlightExpressions,
  highlightAIMLComments,
} from "./aiml-highlighter";
export {
  highlightScriptTags,
  highlightJavaScriptLine,
  highlightPythonLine,
  highlightGenericCodeLine,
} from "./code-highlighter";
