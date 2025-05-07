import {
  aimlElements,
  DiagnosticSeverity,
  type Diagnostic,
} from "@aiml/shared";
import type { Point } from "unist";
import { ObjectSet } from "@aiml/shared";
import { extractErrorLocation } from "../utils/helpers.js";
import type { AIMLASTNode } from "../ast/aiml/aiml.js";
import { parseAIML } from "../ast/aiml/aiml.js";

/**
 * Main parsing function with iterative error correction
 */
export function stringToAST(content: string): {
  ast: AIMLASTNode[];
  diagnostics: Set<Diagnostic>;
} {
  const diagnostics: Set<Diagnostic> = new ObjectSet<Diagnostic>([], "message");

  let ast: AIMLASTNode[] | undefined;
  try {
    ast = parseAIML(content);

    // Add typo warnings
    const typoDiagnostics = warnOnPotentialTagTypos(content);
    typoDiagnostics.forEach((diag) => diagnostics.add(diag));

    return {
      ast,
      diagnostics,
    };
  } catch (error) {
    // Extract error location
    const errorLoc = extractErrorLocation(error, content);
    // Get the line information for the error location
    if (!errorLoc) {
      diagnostics.add({
        message: `Failed to parse prompt: ${error}`,
        severity: DiagnosticSeverity.Error,
        code: "AIML01",
        source: "aiml-parser",
        range: {
          start: { line: 1, column: 1 },
          end: {
            line: content.split("\n").length,
            column:
              content.split("\n")[content.split("\n").length - 1].length + 1,
          },
        },
      });

      return {
        ast: ast ?? [
          {
            type: "Text",
            content: content,
            lineStart: 1,
            columnStart: 1,
            lineEnd: content.split("\n").length,
            columnEnd:
              content.split("\n")[content.split("\n").length - 1].length + 1,
          },
        ],
        diagnostics,
      };
    }

    // Add diagnostic for this specific line
    diagnostics.add({
      message: (error as any).message,
      severity: DiagnosticSeverity.Error,
      code: "AIML010",
      source: "aiml-parser",
      range: {
        start: { line: errorLoc.start, column: 1 },
        end: {
          line: errorLoc.end,
          column: errorLoc.end + 1,
        },
      },
    });
  }

  return {
    ast: ast ?? [],
    diagnostics,
  };
}

// Create a set of lowercase valid tag names for efficient lookup
const validAimlTagsLower = new Set(
  aimlElements.map((tag) => tag.toLowerCase())
);

// Helper function to calculate Levenshtein distance (for similarity)
// (A simple similarity measure as used in the original attempt)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0; // Both empty

  let matchingChars = 0;
  const minLength = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) {
      matchingChars++;
    }
  }
  // Simple prefix matching similarity - adjust if needed
  return matchingChars / maxLength;
}

// Find tags that might be misspelled valid tags and add warnings
function warnOnPotentialTagTypos(content: string): Set<Diagnostic> {
  const diagnostics: Set<Diagnostic> = new ObjectSet<Diagnostic>([], "message");
  const lines = content.split("\n");
  const tagRegex = /<([a-zA-Z0-9_:-]+)([^>]*)>/g; // Find opening tags

  lines.forEach((line, index) => {
    const lineNumber = index + 1; // 1-based line number
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
      const tagName = match[1];
      const tagStartIndex = match.index; // 0-based column index of '<'
      const tagNameStartIndex = tagStartIndex + 1;
      const tagNameEndIndex = tagNameStartIndex + tagName.length;

      // Check if the tag is valid (case-insensitive)
      if (!validAimlTagsLower.has(tagName.toLowerCase())) {
        // Not a valid tag, let's see if it's close to a valid one
        let bestMatch = "";
        let highestSimilarity = 0;

        for (const validTag of aimlElements) {
          const similarity = calculateSimilarity(tagName, validTag);
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = validTag;
          }
        }

        // If we found a reasonably close match, add a warning
        if (highestSimilarity >= 0.7 && bestMatch) {
          const startPoint: Point = {
            line: lineNumber,
            column: tagNameStartIndex + 1,
          }; // 1-based column
          const endPoint: Point = {
            line: lineNumber,
            column: tagNameEndIndex + 1,
          }; // 1-based column

          diagnostics.add({
            message: `Potential typo: Found <${tagName}> which is not a valid AIML element. Did you mean <${bestMatch}>?`,
            severity: DiagnosticSeverity.Warning,
            code: "AIML011", // Reusing the code from the previous attempt
            source: "aiml-parser",
            range: { start: startPoint, end: endPoint },
          });
        }
      }
    }
  });

  return diagnostics;
}
