import type { SemanticTokensBuilder } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { ScriptTagInfo } from "./types";
import { normalizeLanguage, isLineInScriptTag } from "./utils";
import { highlightScriptTags } from "./code-highlighter";
import {
  highlightElements,
  highlightAttributes,
  highlightExpressions,
  highlightAIMLComments,
} from "./aiml-highlighter";

/**
 * Fallback to text-based parsing when AST is not available
 */
export function fallbackToTextBasedParsing(
  text: string,
  document: TextDocument,
  builder: SemanticTokensBuilder
): void {
  // First, extract and highlight script tags with embedded languages
  const scriptTags = extractScriptTags(text, document);

  // Add defensive checks
  if (scriptTags && Array.isArray(scriptTags)) {
    highlightScriptTags(scriptTags, builder);
  }

  // Then highlight the rest of the AIML content with defensive check
  if (text) {
    extractTokensFromText(text, document, builder, scriptTags || []);
  }
}

/**
 * Extract script tags and their embedded content (fallback method)
 */
export function extractScriptTags(
  text: string,
  document: TextDocument
): ScriptTagInfo[] {
  const scriptTags: ScriptTagInfo[] = [];

  // Enhanced regex to capture script tags with optional type attributes
  const scriptRegex =
    /<script(?:[^>]*\s(?:type|lang|language)\s*=\s*["']([^"']*)["'][^>]*)?>([^]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(text)) !== null) {
    const language = match[1] || "javascript"; // Default to JavaScript
    const content = match[2];

    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);

    // Find the actual content start (after the opening tag)
    const contentStart = match.index + match[0].indexOf(content);

    const contentStartPos = document.positionAt(contentStart);
    const contentEndPos = document.positionAt(contentStart + content.length);

    scriptTags.push({
      startLine: startPos.line,
      endLine: endPos.line,
      language: normalizeLanguage(language),
      content: content.trim(),
      startChar: contentStartPos.character,
      endChar: contentEndPos.character,
    });
  }

  return scriptTags;
}

/**
 * Extract semantic tokens using text-based parsing for AIML content
 * Skips script tag content areas to avoid double-highlighting
 */
export function extractTokensFromText(
  text: string,
  document: TextDocument,
  builder: SemanticTokensBuilder,
  scriptTags: ScriptTagInfo[]
): void {
  try {
    const lines = text.split("\n");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip lines that are inside script tags (already highlighted)
      if (isLineInScriptTag(lineIndex, scriptTags)) {
        continue;
      }

      try {
        // Highlight AIML elements
        highlightElements(line, lineIndex, builder);

        // Highlight attributes
        highlightAttributes(line, lineIndex, builder);

        // Highlight expressions
        highlightExpressions(line, lineIndex, builder);

        // Highlight AIML comments
        highlightAIMLComments(line, lineIndex, builder);
      } catch (lineError) {
        // Log error but continue processing other lines
        console.error(`Error highlighting line ${lineIndex}: ${lineError}`);
      }
    }
  } catch (error) {
    // Log error but don't crash the server
    console.error(`Error extracting tokens from text: ${error}`);
  }
}
