import {
  aimlElements,
  type Diagnostic,
  DiagnosticSeverity,
} from "@fireworks/shared";
import remarkGfm from "remark-gfm";
import unifiedAiml from "unified-aiml";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { VFile } from "vfile";
import { extractErrorLocation } from "../utils/helpers.js";
import { cleanASTTree } from "./cleanASTTree.js";
import type { MDXToAIMLOptions } from "../types.js";
import { ObjectSet } from "@fireworks/shared";
import type { Root } from "mdast";

/**
 * Main parsing function with iterative error correction
 */
export function safeParse(
  content: string,
  options: MDXToAIMLOptions
): {
  ast: Root;
  diagnostics: Set<Diagnostic>;
} {
  const { filePath, maxIterations = 10, files, generateIds = true } = options;
  const diagnostics: Set<Diagnostic> = new ObjectSet<Diagnostic>([], "message");

  // Create MDX processor
  const mdxProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMdxFrontmatter, { name: "frontmatter" })
    .use(unifiedAiml);

  // TODO support imported tags too
  const functionalTags = aimlElements;

  // Start iterative correction
  let currentContent = content;
  let iterations = 0;
  const modifiedLines: {
    lineNumber: number;
    originalLine: string;
    placeholderLine: string;
  }[] = [];

  // Helper function to get line information
  function getLineInfo(
    text: string,
    position: number
  ): {
    lineNumber: number;
    lineStart: number;
    lineEnd: number;
    lineContent: string;
  } {
    const lines = text.split("\n");
    let currentPos = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for the newline character
      if (position >= currentPos && position < currentPos + lineLength) {
        return {
          lineNumber: i + 1,
          lineStart: currentPos,
          lineEnd: currentPos + lineLength - 1, // -1 to exclude the newline
          lineContent: lines[i],
        };
      }
      currentPos += lineLength;
    }

    // Default to the last line if position is beyond the content
    const lastIndex = lines.length - 1;
    return {
      lineNumber: lastIndex + 1,
      lineStart: text.lastIndexOf("\n") + 1,
      lineEnd: text.length,
      lineContent: lines[lastIndex],
    };
  }

  // Helper function to replace full line
  function replaceFullLine(
    text: string,
    lineStart: number,
    lineContent: string
  ): {
    newText: string;
    placeholder: string;
  } {
    // Create a placeholder with same length and preserved structure
    const placeholder = " ".repeat(lineContent.length);

    // Split the text into lines for easier handling
    const lines = text.split("\n");

    // Find which line we're replacing
    let currentPos = 0;
    let lineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (
        lineStart >= currentPos &&
        lineStart < currentPos + lines[i].length + 1
      ) {
        lineIndex = i;
        break;
      }
      currentPos += lines[i].length + 1;
    }

    // Replace just that line
    lines[lineIndex] = placeholder;

    // Join back and return
    return {
      newText: lines.join("\n"),
      placeholder,
    };
  }

  // Helper function to find a tag mismatch in a line and try to fix it
  function fixTagMismatch(
    lineInfo: {
      lineNumber: number;
      lineContent: string;
      tagStart: number;
      tagEnd: number;
    },
    errorMsg: string
  ): { fixed: boolean; newLine: string } {
    // Check if the error is related to mismatched opening/closing tags
    const mismatchRegex =
      /Unexpected closing tag `<\/([^>]+)>`, expected corresponding closing tag for `<([^>]+)>`/;
    const match = errorMsg.match(mismatchRegex);

    if (!match) {
      return { fixed: false, newLine: lineInfo.lineContent };
    }

    const closingTag = match[1]; // The tag name in the closing tag (e.g., script)
    const openingTag = match[2].split(" ")[0]; // The tag name in the opening tag (e.g., scrip)

    // Check if the opening tag is close to a valid tag name using fuzzy matching
    let bestMatch = openingTag;
    let highestSimilarity = 0;

    for (const validTag of functionalTags) {
      // Skip if the tag is actually the closing tag (that's the correct one)
      if (validTag.toLowerCase() === closingTag.toLowerCase()) {
        bestMatch = validTag;
        break;
      }

      // Calculate similarity
      const tagLower = openingTag.toLowerCase();
      const validLower = validTag.toLowerCase();
      const maxLength = Math.max(tagLower.length, validLower.length);

      if (maxLength === 0) continue;

      let matchingChars = 0;
      const minLength = Math.min(tagLower.length, validLower.length);

      for (let i = 0; i < minLength; i++) {
        if (tagLower[i] === validLower[i]) {
          matchingChars++;
        }
      }

      const similarity = matchingChars / maxLength;
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = validTag;
      }
    }

    // If we have a good match, update the opening tag
    if (
      highestSimilarity >= 0.7 ||
      bestMatch.toLowerCase() === closingTag.toLowerCase()
    ) {
      // Add diagnostic
      diagnostics.add({
        message: `The tag <${openingTag}> is not a valid AIML element, but <${bestMatch}> is. Corrected <${openingTag}> to <${bestMatch}>`,
        severity: DiagnosticSeverity.Warning,
        code: "AIML011",
        source: "aiml-parser",
        range: {
          start: { line: lineInfo.lineNumber, column: lineInfo.tagStart },
          end: {
            line: lineInfo.lineNumber,
            column: lineInfo.lineContent.length,
          },
        },
      });

      // Fix the tag in the line
      return {
        fixed: true,
        newLine: lineInfo.lineContent.replace(
          new RegExp(`<${openingTag}(\\s|>)`, "g"),
          `<${bestMatch}$1`
        ),
      };
    }

    return { fixed: false, newLine: lineInfo.lineContent };
  }

  while (iterations < maxIterations) {
    try {
      const file = new VFile({ value: currentContent, path: filePath });
      const ast = mdxProcessor.parse(file);

      const cleanedAst = cleanASTTree(
        ast,
        currentContent,
        functionalTags as any,
        diagnostics
      );

      // Restore original lines in the AST
      restoreOriginalContent(cleanedAst, modifiedLines, content);

      // Successfully parsed, return the result
      return {
        ast: cleanedAst,
        diagnostics,
      };
    } catch (error) {
      iterations++;

      // Extract error location
      const errorLoc = extractErrorLocation(error, currentContent);
      if (!errorLoc) {
        // Can't determine error location, add diagnostic
        if (iterations === 1) {
          diagnostics.add({
            message: `Failed to parse MDX content: ${error}`,
            severity: DiagnosticSeverity.Error,
            code: "AIML012",
            source: "aiml-parser",
            range: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 1 },
            },
          });
        }

        // Try one more approach: treat entire content as plain text
        const placeholder = " "; // A simple space as placeholder
        const file = new VFile({ value: placeholder, path: filePath });
        const ast = mdxProcessor.parse(file);

        // Replace with a paragraph containing the entire content as text
        ast.children = [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: content,
              },
            ],
          },
        ];

        return {
          ast,
          diagnostics,
        };
      }

      // Get the line information for the error location
      const lineInfo = getLineInfo(currentContent, errorLoc.start);

      // Check if we've already modified this line to avoid infinite loops
      const alreadyModified = modifiedLines.some(
        (mod) => mod.lineNumber === lineInfo.lineNumber
      );

      if (alreadyModified) {
        // If we've already tried to fix this line and it still fails,
        // we need to look at surrounding context
        const contentLines = currentContent.split("\n");
        let startLine = Math.max(0, lineInfo.lineNumber - 2);
        let endLine = Math.min(
          contentLines.length - 1,
          lineInfo.lineNumber + 2
        );

        // Create a diagnostic covering this broader context
        diagnostics.add({
          message: `Complex syntax error that couldn't be resolved: ${error}`,
          severity: DiagnosticSeverity.Error,
          code: "AIML013",
          source: "aiml-parser",
          range: {
            start: { line: startLine + 1, column: 1 },
            end: {
              line: endLine + 1,
              column: contentLines[endLine].length + 1,
            },
          },
        });

        // Create a simple AST with the content as text as our fallback
        const placeholder = " ";
        const file = new VFile({ value: placeholder, path: filePath });
        const ast = mdxProcessor.parse(file);

        ast.children = [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: content,
              },
            ],
          },
        ];

        return {
          ast,
          diagnostics,
        };
      }

      // Try to fix tag mismatches if possible
      const errorStr = String(error);
      const { fixed, newLine } = fixTagMismatch(
        {
          lineNumber: lineInfo.lineNumber,
          lineContent: lineInfo.lineContent,
          tagStart: lineInfo.lineStart,
          tagEnd: lineInfo.lineEnd,
        },
        errorStr
      );

      if (fixed) {
        // Replace the line in the current content
        const lines = currentContent.split("\n");
        lines[lineInfo.lineNumber - 1] = newLine;
        currentContent = lines.join("\n");

        // Track the modified line
        modifiedLines.push({
          lineNumber: lineInfo.lineNumber,
          originalLine: lineInfo.lineContent,
          placeholderLine: newLine,
        });

        // Continue to next iteration with the fixed content
        continue;
      }

      // If no tag mismatch fix was applied, fall back to replacing the line
      const { newText, placeholder } = replaceFullLine(
        currentContent,
        lineInfo.lineStart,
        lineInfo.lineContent
      );

      // Update the current content
      currentContent = newText;

      // Track the modified line
      modifiedLines.push({
        lineNumber: lineInfo.lineNumber,
        originalLine: lineInfo.lineContent,
        placeholderLine: placeholder,
      });

      // Add diagnostic for this specific line
      diagnostics.add({
        message: `Invalid syntax in line ${lineInfo.lineNumber}: ${error}`,
        severity: DiagnosticSeverity.Warning,
        code: "AIML010",
        source: "aiml-parser",
        range: {
          start: { line: lineInfo.lineNumber, column: 1 },
          end: {
            line: lineInfo.lineNumber,
            column: lineInfo.lineContent.length + 1,
          },
        },
      });
    }
  }

  // If we reach here, we've hit the max iterations but still haven't fixed everything
  diagnostics.add({
    message: `AIMLparsing failed after ${maxIterations} correction attempts`,
    severity: DiagnosticSeverity.Error,
    code: "AIML009",
    source: "aiml-parser",
    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
  });

  // Last resort: create a simple AST with the content as text
  const placeholder = " ";
  const file = new VFile({ value: placeholder, path: filePath });
  const ast = mdxProcessor.parse(file);

  ast.children = [
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          value: content,
        },
      ],
    },
  ];

  return {
    ast,
    diagnostics,
  };
}

/**
 * Helper function to restore original content in the AST
 */
function restoreOriginalContent(
  ast: Root,
  modifiedLines: Array<{
    lineNumber: number;
    originalLine: string;
    placeholderLine: string;
  }>,
  originalContent: string
) {
  if (modifiedLines.length === 0) return;

  const contentByLine = originalContent.split("\n");

  // Function to convert line number to node position (recursive)
  function findNodesByLineNumber(
    node: any,
    parent: any,
    index: number,
    matchedNodes: Array<{ node: any; parent: any; index: number }>
  ) {
    // If node has a position with line info, check if it's one of our modified lines
    if (
      node.position &&
      typeof node.position.start?.line === "number" &&
      typeof node.position.end?.line === "number"
    ) {
      // Check if this node spans any of our modified lines
      for (const lineMod of modifiedLines) {
        if (
          lineMod.lineNumber >= node.position.start.line &&
          lineMod.lineNumber <= node.position.end.line
        ) {
          matchedNodes.push({ node, parent, index });
          break;
        }
      }
    }

    // Recursively check children
    if (node.children && Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        findNodesByLineNumber(node.children[i], node, i, matchedNodes);
      }
    }
  }

  // Collect nodes that contain modified lines
  const matchedNodes: Array<{ node: any; parent: any; index: number }> = [];
  findNodesByLineNumber(ast, null, -1, matchedNodes);

  // Process text nodes for placeholder replacement
  function processTextNodes(node: any) {
    // If it's a text node, look for placeholders
    if (node.type === "text" && typeof node.value === "string") {
      for (const lineMod of modifiedLines) {
        if (node.value.includes(lineMod.placeholderLine)) {
          // Replace the placeholder with the original line
          node.value = node.value.replace(
            lineMod.placeholderLine,
            lineMod.originalLine
          );
        }
      }
    }

    // Process children recursively
    if (node.children && Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        processTextNodes(node.children[i]);
      }
    }
  }

  // First pass: Replace placeholders in text nodes
  processTextNodes(ast);

  // Second pass: Handle any empty paragraphs that should contain our content
  for (const { node, parent, index } of matchedNodes) {
    // Check if it's an empty text node or mostly whitespace
    if (
      node.type === "paragraph" &&
      node.children &&
      node.children.length === 1 &&
      node.children[0].type === "text" &&
      node.children[0].value.trim() === ""
    ) {
      // Find which modified lines are contained in this node
      const relevantLines = modifiedLines.filter(
        (mod) =>
          mod.lineNumber >= node.position.start.line &&
          mod.lineNumber <= node.position.end.line
      );

      if (relevantLines.length > 0) {
        // Replace with the original lines
        const originalLines = relevantLines.map((mod) => mod.originalLine);

        // If we have a parent reference, update the node
        if (parent && typeof index === "number") {
          parent.children[index] = {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: originalLines.join("\n"),
              },
            ],
            position: node.position,
          };
        }
      }
    }
  }
}
