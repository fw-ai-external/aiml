import { type Diagnostic, DiagnosticSeverity } from "@fireworks/shared";
import { fuzzyMatch } from "../utils/fuzzySearchTags.js";
import { visit } from "unist-util-visit";
import { getPosition } from "../utils/helpers.js";
import type { Root } from "mdast";

/**
 * Find best matching tag name for a given input
 */
function findBestMatchingTag(tagName: string, aimlElements: string[]): string {
  if (!tagName) return tagName;

  let bestMatch = tagName;
  let highestSimilarity = 0;

  const tag = tagName.toLowerCase();

  for (const element of aimlElements) {
    const elem = element.toLowerCase();

    // Exact match
    if (tag === elem) return element;

    // Calculate similarity
    const maxLength = Math.max(tag.length, elem.length);
    if (maxLength === 0) continue;

    let matchingChars = 0;
    const minLength = Math.min(tag.length, elem.length);

    for (let i = 0; i < minLength; i++) {
      if (tag[i] === elem[i]) matchingChars++;
    }

    const similarity = matchingChars / maxLength;

    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = element;
    }
  }

  // Only return the best match if it's reasonably close
  return highestSimilarity >= 0.7 ? bestMatch : tagName;
}

/**
 * Run through the AST as a secondary pass at validation of the AST
 * - Checks for tag name mismatches
 * - Checks for JSX tags that are wrapping AIML elements
 * - Converts non-allowed JSX elements to paragraphs
 *
 *  TODO: Merge this functionality into safeParse
 */
export function cleanASTTree(
  ast: Root,
  content: string,
  aimlElements: string[],
  diagnostics: Set<Diagnostic>
) {
  // First pass - identify and fix mismatched tag names
  visit(ast, "mdxJsxFlowElement", (node: any, index: any, parent: any) => {
    const tagName = node.name;

    // Check for tag name mismatch in opening/closing tags
    if (
      node.attributes &&
      node.attributes.length === 0 &&
      node.children &&
      node.children.length > 0
    ) {
      // This is a full element with opening and closing tags
      // Check if there might be a mismatch between opening and closing tag names
      // We can't directly see the closing tag name in the AST, but we can infer potential issues

      // If the tag name is not in aimlElements, try to find a close match
      if (!aimlElements.includes(tagName)) {
        const bestMatch = findBestMatchingTag(tagName, aimlElements);

        if (bestMatch !== tagName) {
          // We've found a potential correction
          node.name = bestMatch;

          diagnostics.add({
            message: `Detected possible tag name mismatch. Corrected <${tagName}> to <${bestMatch}>`,
            severity: DiagnosticSeverity.Warning,
            code: "AIML011",
            source: "aiml-parser",
            range: {
              start: {
                line: getPosition(node, "start", "line"),
                column: getPosition(node, "start", "column"),
              },
              end: {
                line: getPosition(node, "start", "line"),
                column:
                  getPosition(node, "start", "column") + tagName.length + 1,
              },
            },
          });
        }
      }
    }

    // Check if tag is in allowed elements
    if (!fuzzyMatch(tagName, aimlElements)) {
      // Add diagnostic for non-matching tag
      diagnostics.add({
        message: `JSX element <${tagName}> is not in the list of allowed AIML elements and will be treated as text`,
        severity: DiagnosticSeverity.Warning,
        code: "AIML008",
        source: "aiml-parser",
        range: {
          start: {
            line: getPosition(node, "start", "line"),
            column: getPosition(node, "start", "column"),
          },
          end: {
            line: getPosition(node, "end", "line"),
            column: getPosition(node, "end", "column"),
          },
        },
      });

      // Mark node for conversion to paragraph
      (node as any).__convertToParagraph = true;
    }

    // Check if JSX tags are wrapping AIML elements
    if (node.children) {
      const hasNestedAimlElements = node.children.some(
        (child: any) =>
          child.type === "mdxJsxFlowElement" &&
          child.name &&
          fuzzyMatch(child.name, aimlElements)
      );

      if (hasNestedAimlElements) {
        diagnostics.add({
          message: `XML tag syntax (<${node.name}> ... </${node.name}>) with opening and closing tags is wrapping AIML elements... this will cause the elements to be treated as text`,
          severity: DiagnosticSeverity.Error,
          code: "AIML007",
          source: "aiml-parser",
          range: {
            start: {
              line: getPosition(node, "start", "line"),
              column: getPosition(node, "start", "column"),
            },
            end: {
              line: getPosition(node, "end", "line"),
              column: getPosition(node, "end", "column"),
            },
          },
        });
      }
    }
  });

  // Second pass to convert marked nodes to paragraphs
  visit(ast, "mdxJsxFlowElement", (node: any, index: any, parent: any) => {
    if (
      (node as any).__convertToParagraph &&
      parent &&
      typeof index === "number"
    ) {
      // Original source content based on position
      let original = "";
      if (
        node.position?.start?.offset !== undefined &&
        node.position?.end?.offset !== undefined
      ) {
        original = content.substring(
          node.position.start.offset,
          node.position.end.offset
        );
      } else {
        original = `<${node.name}>...</${node.name}>`;
      }

      // Replace with paragraph
      parent.children[index] = {
        type: "paragraph",
        children: [
          {
            type: "text",
            value: original,
          },
        ],
        position: node.position,
      };
    }
  });

  return ast;
}
