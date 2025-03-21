import {
  SerializedBaseElement,
  Diagnostic,
  TextNode,
  ExpressionNode,
  DiagnosticSeverity,
} from "@fireworks/shared";
import {
  validateAssignElements,
  buildDatamodelFromAST,
} from "./validate-assign.js";
import { MDXToAIMLOptions } from "../types.js";
import { Node } from "unist";
import { extractTextFromNode } from "../utils/text-extraction.js";
import {
  generateKey,
  getPosition,
  parseImportStatement,
} from "../utils/helpers.js";

/**
 * Process attributes from an AST node into a record
 */
export function processAttributes(attributes: any[]): Record<string, any> {
  if (!attributes || !Array.isArray(attributes)) {
    return {};
  }

  const result: Record<string, any> = {};

  for (const attr of attributes) {
    if (attr.type === "mdxJsxAttribute") {
      if (attr.value === null) {
        // Boolean attribute
        result[attr.name] = true;
      } else if (typeof attr.value === "string") {
        // String attribute
        result[attr.name] = attr.value;
      } else if (attr.value?.type === "mdxJsxAttributeValueExpression") {
        // Expression attribute - try to evaluate simple expressions
        try {
          // For simple literals like numbers, booleans, etc.
          // eslint-disable-next-line no-eval
          result[attr.name] = Function(
            `"use strict"; return (${attr.value.value})`
          )();
        } catch (e) {
          // If evaluation fails, store as a string expression
          result[attr.name] = `\${${attr.value.value}}`;
        }
      }
    }
  }

  return result;
}

/**
 * Convert a paragraph node to an LLM element
 */
export function convertParagraphToLlmNode(
  paragraphNode: SerializedBaseElement
): SerializedBaseElement {
  let promptText = "";

  if (paragraphNode.children) {
    for (const child of paragraphNode.children) {
      if (child.type === "text") {
        promptText += (child as TextNode).value;
      } else if (child.type === "expression") {
        promptText += `\${${(child as ExpressionNode).value}}`;
      }
    }
  }

  return {
    type: "element",
    key: generateKey(),
    tag: "llm",
    role: "action",
    elementType: "llm",
    attributes: {
      prompt: "${input}",
      instructions: promptText,
      model: "accounts/fireworks/models/llama-v3p1-8b-instruct", // Default model
    },
    children: [],
    lineStart: paragraphNode.lineStart,
    lineEnd: paragraphNode.lineEnd,
    columnStart: paragraphNode.columnStart,
    columnEnd: paragraphNode.columnEnd,
  } as SerializedBaseElement;
}

/**
 * Transform unified AST to AIML nodes
 * @param ast The unified AST
 * @param options Parsing options
 * @param diagnostics Array to collect diagnostics
 * @returns An array of AIML nodes
 */
export function transformToAIMLNodes(
  ast: Node,
  options: MDXToAIMLOptions,
  diagnostics: Diagnostic[]
): SerializedBaseElement[] {
  const nodes: SerializedBaseElement[] = [];
  const additionalNodes: SerializedBaseElement[] = [];

  // Process root node's children
  if ("children" in ast && Array.isArray(ast.children)) {
    for (const child of ast.children) {
      const transformed = transformNode(
        child,
        options,
        diagnostics,
        additionalNodes
      );
      if (transformed) {
        nodes.push(transformed);
      }
    }

    // Add any additional nodes from processing
    if (additionalNodes.length > 0) {
      nodes.push(...additionalNodes);
    }

    // Merge adjacent paragraphs
    mergeParagraphs(nodes);

    // Build datamodel from data elements
    const datamodel = buildDatamodelFromAST(ast);

    // Validate assign elements
    const assignDiagnostics = validateAssignElements(ast, datamodel);

    // Add assign diagnostics to the result
    diagnostics.push(...assignDiagnostics);
  }

  return nodes;
}

/**
 * Transform a single AST node to an AIML node
 * @param node AST node to transform
 * @param options Parsing options
 * @param diagnostics Diagnostic collection
 * @param additionalNodes Array to collect additional nodes
 * @returns Transformed AIML node or null
 */
export function transformNode(
  node: any,
  options: MDXToAIMLOptions,
  diagnostics: Diagnostic[],
  additionalNodes: SerializedBaseElement[]
): SerializedBaseElement | null {
  // Handle different node types
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    // Process JSX elements into AIML elements
    const lineStart = getPosition(node, "start", "line");
    const columnStart = getPosition(node, "start", "column");
    const lineEnd = getPosition(node, "end", "line");
    const columnEnd = getPosition(node, "end", "column");

    // Handle elements
    return {
      type: "element",
      key: generateKey(),
      tag: node.name,
      role:
        node.name.toLowerCase().includes("state") ||
        node.name.toLowerCase() === "workflow"
          ? "state"
          : node.name.toLowerCase().includes("error")
            ? "error"
            : node.name.toLowerCase().includes("output")
              ? "output"
              : node.name.toLowerCase().includes("input")
                ? "user-input"
                : "action",
      elementType: node.name.toLowerCase() as any,
      attributes: processAttributes(node.attributes),
      children:
        node.children
          ?.map((child: any) =>
            transformNode(child, options, diagnostics, additionalNodes)
          )
          .filter(Boolean) || [],
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
    };
  } else if (node.type === "paragraph") {
    // Create a paragraph node
    const lineStart = getPosition(node, "start", "line");
    const columnStart = getPosition(node, "start", "column");
    const lineEnd = getPosition(node, "end", "line");
    const columnEnd = getPosition(node, "end", "column");

    // Process the children of the paragraph
    const children: SerializedBaseElement[] = [];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === "text") {
          // Add text node
          children.push({
            type: "text",
            key: generateKey(),
            value: child.value,
            lineStart: getPosition(child, "start", "line"),
            lineEnd: getPosition(child, "end", "line"),
            columnStart: getPosition(child, "start", "column"),
            columnEnd: getPosition(child, "end", "column"),
          });
        } else if (child.type === "mdxTextExpression") {
          // Process JSX expressions in text (like {someVar})
          children.push({
            type: "expression",
            key: generateKey(),
            value: child.value,
            lineStart: getPosition(child, "start", "line"),
            lineEnd: getPosition(child, "end", "line"),
            columnStart: getPosition(child, "start", "column"),
            columnEnd: getPosition(child, "end", "column"),
          });
        } else if (child.type === "mdxJsxTextElement") {
          // Nested JSX in paragraph
          const transformed = transformNode(
            child,
            options,
            diagnostics,
            additionalNodes
          );
          if (transformed) {
            children.push(transformed);
          }
        }
      }
    }

    // Create paragraph node
    return {
      type: "paragraph",
      key: generateKey(),
      children,
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
    };
  } else if (node.type === "mdxJsxAttribute") {
    // Skip attribute nodes - they are handled by their parent element
    return null;
  } else if (node.type === "mdxjsFrontmatter") {
    // Process frontmatter into a header node
    const fields: SerializedBaseElement[] = [];

    if (node.value) {
      // Try to parse YAML frontmatter
      try {
        const yaml = node.value;
        const lines = yaml.split("\n");

        for (const line of lines) {
          const match = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/);
          if (match) {
            const id = match[1];
            const value = match[2].replace(/^['"]|['"]$/g, ""); // Remove quotes

            fields.push({
              type: "headerField",
              key: generateKey(),
              id,
              value,
              lineStart: getPosition(node, "start", "line"),
              lineEnd: getPosition(node, "end", "line"),
              columnStart: getPosition(node, "start", "column"),
              columnEnd: getPosition(node, "end", "column"),
            });
          }
        }
      } catch (e) {
        // Add diagnostic for failed frontmatter parsing
        diagnostics.push({
          message: `Failed to parse frontmatter: ${e}`,
          severity: DiagnosticSeverity.Warning,
          code: "AIML003",
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

    return {
      type: "header",
      key: generateKey(),
      children: fields,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "mdxjsEsm") {
    // Process ES modules (import statements)
    if (node.value && node.value.includes("import")) {
      const { namedImports, defaultImport, source } = parseImportStatement(
        node.value
      );

      if (source) {
        return {
          type: "import",
          key: generateKey(),
          filePath: source,
          namedImports,
          defaultImport,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        };
      }
    }

    return null;
  } else if (node.type === "heading") {
    // Process headings - could convert to a special element or text
    const text = extractTextFromNode(node);
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: text || "",
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "html") {
    // Raw HTML - convert to text
    return {
      type: "text",
      key: generateKey(),
      value: node.value,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "list" || node.type === "listItem") {
    // Convert lists to text paragraphs
    const text = extractTextFromNode(node);
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: text || "",
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "text") {
    // Plain text outside of paragraphs
    if (node.value.trim() === "") {
      return null; // Skip empty text nodes
    }

    // If it's a standalone text node, wrap it in a paragraph
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: node.value,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "code") {
    // Code blocks - convert to text
    const text = `\`\`\`${node.lang || ""}\n${node.value || ""}\n\`\`\``;
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: text,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "inlineCode") {
    // Inline code - convert to text
    return {
      type: "text",
      key: generateKey(),
      value: `\`${node.value || ""}\``,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "thematicBreak") {
    // Horizontal rule - convert to text
    return {
      type: "text",
      key: generateKey(),
      value: "---",
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "mdxFlowExpression") {
    // MDX expression outside JSX - create an expression node
    return {
      type: "expression",
      key: generateKey(),
      value: node.value,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "blockquote") {
    // Convert blockquotes to text
    const text = extractTextFromNode(node);
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: text || "",
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  }

  // For unsupported node types, log a diagnostic and return null
  console.warn(`Unsupported node type: ${node.type}`);
  diagnostics.push({
    message: `Unsupported node type: ${node.type}`,
    severity: DiagnosticSeverity.Information,
    code: "AIML004",
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

  return null;
}

/**
 * Merge adjacent paragraph nodes in the node array
 * This helps with combining text across line breaks
 */
export function mergeParagraphs(nodes: SerializedBaseElement[]): void {
  if (nodes.length < 2) return;

  for (let i = 0; i < nodes.length - 1; i++) {
    // Check if current and next nodes are both paragraphs
    if (nodes[i]?.type === "paragraph" && nodes[i + 1]?.type === "paragraph") {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];

      // Combine the children arrays
      const combinedChildren = [
        ...(currentNode.children || []),
        ...(nextNode.children || []),
      ];

      // Update the current node with combined children and adjusted end position
      currentNode.children = combinedChildren;
      currentNode.lineEnd = nextNode.lineEnd;
      currentNode.columnEnd = nextNode.columnEnd;

      // Remove the next node as it's now merged
      nodes.splice(i + 1, 1);

      // Decrement i to check the merged node against the next one
      i--;
    }
  }
}
