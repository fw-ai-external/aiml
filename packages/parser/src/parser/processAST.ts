import { type Diagnostic, DiagnosticSeverity } from "@fireworks/shared";
import { fuzzyMatch } from "./fuzzySearchTags.js";
import { visit } from "unist-util-visit";
import { getPosition } from "../utils/helpers.js";
import type { Root } from "mdast";
/**
 * Parse the content and check for non-allowed JSX elements
 */
export function processAst(
  ast: Root,
  content: string,
  aimlElements: string[],
  diagnostics: Set<Diagnostic>
) {
  visit(ast, "mdxJsxFlowElement", (node: any, index: any, parent: any) => {
    const tagName = node.name;

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
