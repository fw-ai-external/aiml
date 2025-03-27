import {
  aimlElements,
  type Diagnostic,
  DiagnosticSeverity,
} from "@fireworks/shared";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { VFile } from "vfile";
import {
  extractErrorLocation,
  findJsxElement,
  escapeLineContent,
} from "../utils/helpers.js";
import { fuzzyMatch } from "./fuzzySearchTags.js";
import { processAst } from "./processAST.js";
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
    .use(remarkMdx);

  // TODO get imported element tag names
  const functionalTags = aimlElements as unknown as string[];

  // Initial attempt to parse the full content
  try {
    const file = new VFile({ value: content, path: filePath });
    const ast = mdxProcessor.parse(file);

    // Check for non-allowed tags and wrap diagnostics
    const cleanedAst = processAst(ast, content, functionalTags, diagnostics);
    return {
      ast: cleanedAst,
      diagnostics,
    };
  } catch (initialError) {
    console.warn(
      "Initial MDX parsing failed, using iterative fallback:",
      initialError
    );

    // Start iterative correction
    let currentContent = content;
    let iterations = 0;
    let modifiedRanges: { start: number; end: number }[] = [];

    while (iterations < maxIterations) {
      try {
        const file = new VFile({ value: currentContent, path: filePath });
        const ast = mdxProcessor.parse(file);

        console.log("preping to return", currentContent);

        const cleanedAst = processAst(
          ast,
          currentContent,
          functionalTags,
          diagnostics
        );

        // Successfully parsed, return the result
        return {
          ast: cleanedAst,
          diagnostics,
        };
      } catch (error) {
        console.log("currentContent", currentContent);
        console.log("error", error);
        iterations++;

        // Extract error location
        const errorLoc = extractErrorLocation(error, currentContent);
        if (!errorLoc) {
          // Can't determine error location, escape the entire content as fallback
          if (iterations === 1) {
            diagnostics.add({
              message: `Failed to parse MDX content: ${error}`,
              severity: DiagnosticSeverity.Error,
              code: "AIML012",
              source: "aiml-parser",
              range: {
                start: { line: 1, column: 1 },
                end: { line: 1, column: 2 },
              },
            });
          }

          // Escape the entire content as a last resort
          const escapedContent = escapeLineContent(currentContent);

          const file = new VFile({ value: escapedContent, path: filePath });
          const ast = mdxProcessor.parse(file);

          return {
            ast,
            diagnostics,
          };
        }

        // Find JSX element in the problematic region
        const jsxElement = findJsxElement(
          currentContent,
          errorLoc.start,
          errorLoc.end
        );
        console.log("jsxElement", jsxElement);

        if (jsxElement) {
          console.log("found jsxElement", jsxElement);
          // Check if we already processed this range to avoid infinite loops
          const isRangeProcessed = modifiedRanges.some(
            (range) =>
              jsxElement.startIdx >= range.start &&
              jsxElement.endIdx <= range.end
          );

          if (isRangeProcessed) {
            // We've already tried to fix this range, escape a larger section
            const expandedStart = Math.max(0, errorLoc.start - 20);
            const expandedEnd = Math.min(
              currentContent.length,
              errorLoc.end + 20
            );
            const before = currentContent.substring(0, expandedStart);
            const problematic = currentContent.substring(
              expandedStart,
              expandedEnd
            );
            const after = currentContent.substring(expandedEnd);

            // Escape the expanded problematic section
            const escaped = escapeLineContent(problematic);

            currentContent = before + escaped + after;

            // Record that we've modified this expanded range
            modifiedRanges.push({ start: expandedStart, end: expandedEnd });
          } else {
            console.log("processing jsxElement", jsxElement);
            // Add diagnostic about the problematic JSX element
            const lines = currentContent
              .substring(0, jsxElement.startIdx)
              .split("\n");
            const startLine = lines.length;
            const startCol = lines[lines.length - 1].length + 1;

            const isAllowed = fuzzyMatch(jsxElement.tagName, functionalTags);

            if (isAllowed && iterations === 1) {
              // It's allowed but may have syntax issues or might be wrapping AIML elements
              diagnostics.add({
                message: `XML syntax error in tag <${jsxElement.tagName}>. ${error}`,
                severity: DiagnosticSeverity.Error,
                code: "AIML011",
                source: "aiml-parser",
                range: {
                  start: { line: startLine, column: startCol },
                  end: {
                    line: startLine,
                    column: startCol + jsxElement.tagName.length + 2,
                  },
                },
              });
            }

            if (
              error instanceof Error &&
              !error.message.includes("attribute name")
            ) {
              // Extract the problematic JSX element
              const before = currentContent.substring(0, jsxElement.startIdx);
              const jsxContent = currentContent.substring(
                jsxElement.startIdx,
                jsxElement.endIdx
              );
              const after = currentContent.substring(jsxElement.endIdx);

              // Escape the JSX content
              const escaped = escapeLineContent(jsxContent);

              currentContent = before + escaped + after;

              // Record that we've modified this range
              modifiedRanges.push({
                start: jsxElement.startIdx,
                end: jsxElement.startIdx + escaped.length,
              });
            }
          }
        } else {
          // No specific JSX element found, escape a chunk around the error
          const before = currentContent.substring(0, errorLoc.start);
          const problematic = currentContent.substring(
            errorLoc.start,
            errorLoc.end
          );
          const after = currentContent.substring(errorLoc.end);

          // Escape the problematic section
          const escaped = escapeLineContent(problematic);
          console.log("escaped", before, escaped, after);

          currentContent = before + escaped + after;

          // Record that we've modified this range
          modifiedRanges.push({
            start: errorLoc.start,
            end: errorLoc.start + escaped.length,
          });

          // Add a generic diagnostic
          const lines = currentContent.substring(0, errorLoc.start).split("\n");
          const errorLine = lines.length;
          const errorCol = lines[lines.length - 1].length + 1;

          diagnostics.clear();
          diagnostics.add({
            message: `Invalid XML syntax: ${error} for ${currentContent}`,
            severity: DiagnosticSeverity.Warning,
            code: "AIML010",
            source: "aiml-parser",
            range: {
              start: { line: errorLine, column: errorCol },
              end: { line: errorLine, column: errorCol + 10 },
            },
          });
        }
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

    // Last resort: escape the entire content and parse
    const escapedContent = escapeLineContent(content);

    const file = new VFile({ value: escapedContent, path: filePath });

    const ast = mdxProcessor.parse(file);

    return {
      ast,
      diagnostics,
    };
  }
}
