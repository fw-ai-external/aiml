import {
  type Diagnostic,
  DiagnosticSeverity,
  type ExpressionNode,
  type SerializedBaseElement,
  type TextNode,
  type DataModel,
  type FieldDefinition,
  type FieldType,
  aimlElements,
} from "@fireworks/shared";
import { validateAttributes } from "./validateAttributes.js";

interface ParserContext {
  currentStates: string[];
  datamodel: Map<string, Record<string, FieldDefinition>>;
}
import type { Node } from "unist";
import type { MDXToAIMLOptions } from "../types.js";
import {
  generateKey,
  getPosition,
  parseImportStatement,
} from "../utils/helpers.js";
import { extractTextFromNode } from "../utils/text-extraction.js";
import {
  buildDatamodelFromAST,
  validateAssignElements,
} from "./validateAssignElements.js";
import { allElementConfigs, type ElementDefinition } from "@fireworks/shared";

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
        // Use AST information from the expression if available
        if (attr.value.data && attr.value.data.estree) {
          const expression = attr.value.data.estree.body[0]?.expression;

          if (expression) {
            const expressionType = expression.type;

            if (expressionType === "ArrayExpression") {
              // Array expression: []
              result[attr.name] = `\${array:${attr.value.value}}`;
            } else if (expressionType === "ObjectExpression") {
              // Object expression: {}
              result[attr.name] = `\${object:${attr.value.value}}`;
            } else if (
              expressionType === "ArrowFunctionExpression" ||
              expressionType === "FunctionExpression"
            ) {
              // Function expression: () => {} or function() {}
              result[attr.name] = `\${function:${attr.value.value}}`;
            } else {
              // Other expression types
              result[attr.name] = `\${${attr.value.value}}`;
            }
          } else {
            // Fallback if no expression is found
            result[attr.name] = `\${${attr.value.value}}`;
          }
        } else {
          // Fallback to the old approach if estree data is not available
          const expressionValue = attr.value.value.trim();

          // Fallback checks for expressions without full AST info
          if (
            expressionValue.includes("=>") ||
            /^\s*function\s*\(/.test(expressionValue)
          ) {
            result[attr.name] = `\${function:${expressionValue}}`;
          } else if (
            expressionValue.startsWith("[") &&
            expressionValue.endsWith("]")
          ) {
            result[attr.name] = `\${array:${expressionValue}}`;
          } else if (
            expressionValue.startsWith("{") &&
            expressionValue.endsWith("}")
          ) {
            result[attr.name] = `\${object:${expressionValue}}`;
          } else {
            result[attr.name] = `\${${expressionValue}}`;
          }
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
  paragraphNode: SerializedBaseElement,
  scope: string[]
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
    scope,
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
  diagnostics: Set<Diagnostic>
): {
  nodes: SerializedBaseElement[];
  diagnostics: Set<Diagnostic>;
  datamodel: Record<string, DataModel>;
} {
  const nodes: SerializedBaseElement[] = [];
  const context: ParserContext = {
    currentStates: [],
    datamodel: new Map(),
  };

  // Process root node's children
  if ("children" in ast && Array.isArray(ast.children)) {
    for (const child of ast.children) {
      const transformed = astToElementTree(
        child,
        options,
        diagnostics,
        context
      );
      if (transformed) {
        nodes.push(transformed);
      }
    }

    // Merge adjacent paragraphs
    mergeParagraphs(nodes);

    // Build datamodel from data elements and merge with context datamodel
    const builtDatamodel = buildDatamodelFromAST(ast);

    // Convert built datamodel to same format as context datamodel
    for (const [scope, fields] of Object.entries(builtDatamodel)) {
      if (!context.datamodel.has(scope)) {
        context.datamodel.set(scope, {});
      }
      for (const [fieldName, fieldDef] of Object.entries(fields)) {
        if (fieldDef) {
          context.datamodel.get(scope)![fieldName] = {
            type: fieldDef.type as FieldType,
            readonly: fieldDef.readonly,
            fromRequest: fieldDef.fromRequest,
            defaultValue: fieldDef.defaultValue,
            schema: fieldDef.schema,
          };
        } else {
          diagnostics.add({
            message: `Invalid definition for <data id="${fieldName}">`,
            severity: DiagnosticSeverity.Error,
            code: "AIML008",
            source: "aiml-parser",
            range: {
              start: { line: 0, column: 0 },
              end: { line: 0, column: 0 },
            },
          });
        }
      }
    }

    // Validate assign elements
    const assignDiagnostics = validateAssignElements(ast, builtDatamodel);
    for (const diagnostic of assignDiagnostics) {
      diagnostics.add(diagnostic);
    }
  }

  // Convert RuntimeFieldDefinition to DataModel format
  const convertedDatamodel: Record<string, DataModel> = {};
  for (const [scope, fields] of context.datamodel.entries()) {
    convertedDatamodel[scope] = {};
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      if (fieldDef) {
        convertedDatamodel[scope][fieldName] = {
          type: fieldDef.type as FieldType,
          readonly: fieldDef.readonly,
          fromRequest: fieldDef.fromRequest,
          defaultValue: fieldDef.defaultValue,
          schema: fieldDef.schema,
        };
      } else {
        diagnostics.add({
          message: `Invalid definition for <data id="${fieldName}">`,
          severity: DiagnosticSeverity.Error,
          code: "AIML008",
          source: "aiml-parser",
          range: {
            start: { line: 0, column: 0 },
            end: { line: 0, column: 0 },
          },
        });
      }
    }
  }

  return {
    nodes,
    diagnostics,
    datamodel: convertedDatamodel,
  };
}

/**
 * Transform a single AST node to an AIML node
 * @param node AST node to transform
 * @param options Parsing options
 * @param diagnostics Diagnostic collection
 * @param additionalNodes Array to collect additional nodes
 * @returns Transformed AIML node or null
 */
export function astToElementTree(
  node: any,
  options: MDXToAIMLOptions,
  diagnostics: Set<Diagnostic>,
  context: ParserContext
): SerializedBaseElement | null {
  // Handle different node types
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    const lineStart = getPosition(node, "start", "line");
    const columnStart = getPosition(node, "start", "column");
    const lineEnd = getPosition(node, "end", "line");
    const columnEnd = getPosition(node, "end", "column");
    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    // Process attributes
    const processedAttributes = processAttributes(node.attributes);

    // Check if this is a valid AIML element
    const normalizedName = node.name.toLowerCase();
    const isValidAimlElement = aimlElements.includes(normalizedName as any);

    if (!isValidAimlElement) {
      // For unknown elements, add warning and skip
      diagnostics.add({
        message: `Unknown element <${node.name}> will be skipped`,
        severity: DiagnosticSeverity.Warning,
        code: "AIML014",
        source: "aiml-parser",
        range: {
          start: { line: lineStart, column: columnStart },
          end: { line: lineEnd, column: columnEnd },
        },
      });
      return null;
    }

    // Special handling for workflow element
    if (normalizedName === "workflow" && context.currentStates.length === 0) {
      context.currentStates.push("root");
    }

    // For valid AIML elements, proceed with normal processing
    diagnostics = validateAttributes(node, processedAttributes, diagnostics);

    const nodeConfig: ElementDefinition =
      allElementConfigs[
        node.name.toLowerCase() as keyof typeof allElementConfigs
      ];
    // Handle elements
    const isState =
      ["state", "user-input", "output"].includes(nodeConfig.role) &&
      nodeConfig.tag !== "workflow";
    let stateId: string | undefined;

    if (isState) {
      stateId = processAttributes(node.attributes).id;
      if (!stateId) {
        stateId = `anonymous_state_${generateKey()}`;
        diagnostics.add({
          message: `State element missing ID - generated: ${stateId}`,
          severity: DiagnosticSeverity.Warning,
          code: "AIML005",
          source: "aiml-parser",
          range: {
            start: { line: lineStart, column: columnStart },
            end: { line: lineEnd, column: columnEnd },
          },
        });
      }
      context.currentStates.push(stateId);
    }

    const isData = node.name.toLowerCase() === "data";
    if (isData) {
      const attrs = processAttributes(node.attributes);
      const fieldName =
        attrs.id || (isData ? `data_${generateKey()}` : `dm_${generateKey()}`);
      let defaultValueString = extractTextFromNode(node.children?.[0]) || "";
      let typedDefaultValue: any = defaultValueString;
      try {
        typedDefaultValue =
          attrs.type === "json"
            ? JSON.parse(defaultValueString)
            : attrs.type === "number"
              ? defaultValueString.includes(".")
                ? parseFloat(defaultValueString)
                : parseInt(defaultValueString)
              : attrs.type === "boolean"
                ? defaultValueString === "false"
                  ? false
                  : true
                : defaultValueString;
      } catch (e) {
        diagnostics.add({
          message: `Error parsing default value into type ${attrs.type} for ${fieldName}: ${e}`,
          severity: DiagnosticSeverity.Warning,
          code: "AIML006",
          source: "aiml-parser",
          range: {
            start: { line: lineStart, column: columnStart },
            end: { line: lineEnd, column: columnEnd },
          },
        });
      }

      const fieldDef: FieldDefinition = {
        type: attrs.type || "json",
        readonly: !!attrs.readonly,
        fromRequest: false,
        defaultValue: typedDefaultValue,
        schema:
          attrs.type === "string"
            ? {
                type: "string",
              }
            : attrs.type === "number"
              ? {
                  type: "number",
                }
              : attrs.type === "boolean"
                ? {
                    type: "boolean",
                  }
                : attrs.type === "json"
                  ? attrs.schema
                  : {
                      type: "string",
                    },
      };
      const scopeKey =
        context.currentStates.length > 0
          ? `root.${context.currentStates.join(".")}`
          : "root";

      if (!context.datamodel.has(scopeKey)) {
        context.datamodel.set(scopeKey, {});
      }
      context.datamodel.get(scopeKey)![fieldName] = fieldDef;
    }

    const children =
      node.children
        ?.map((child: any) =>
          astToElementTree(child, options, diagnostics, context)
        )
        .filter(Boolean) || [];

    const config =
      allElementConfigs[
        node.name.toLowerCase() as keyof typeof allElementConfigs
      ];

    if (!config) {
      return null;
    }

    return {
      type: "element",
      key: generateKey(),
      tag: config.tag,
      scope,
      role: config.role,
      elementType: config.elementType,
      attributes: {
        ...processedAttributes,
        ...(isState && stateId ? { id: stateId } : {}),
      },
      children,
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
        const scope =
          context.currentStates.length > 0
            ? ["root", ...context.currentStates]
            : ["root"];

        if (child.type === "text") {
          // Add text node
          children.push({
            type: "text",
            key: generateKey(),
            scope,
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
            scope,
            value: child.value,
            lineStart: getPosition(child, "start", "line"),
            lineEnd: getPosition(child, "end", "line"),
            columnStart: getPosition(child, "start", "column"),
            columnEnd: getPosition(child, "end", "column"),
          });
        } else if (child.type === "mdxJsxTextElement") {
          // Nested JSX in paragraph
          const transformed = astToElementTree(
            child,
            options,
            diagnostics,
            context
          );
          if (transformed) {
            children.push(transformed);
          }
        }
      }
    }

    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    // Create paragraph node
    return {
      type: "paragraph",
      key: generateKey(),
      scope,
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
              scope: ["root"],
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
        diagnostics.add({
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
      scope: ["root"],
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
          scope: ["root"],
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
    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    return {
      type: "paragraph",
      key: generateKey(),
      scope,
      children: [
        {
          type: "text",
          key: generateKey(),
          scope,
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
    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    return {
      type: "text",
      key: generateKey(),
      scope,
      value: node.value,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "list" || node.type === "listItem") {
    // Convert lists to text paragraphs
    const text = extractTextFromNode(node);
    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    return {
      type: "paragraph",
      key: generateKey(),
      scope,
      children: [
        {
          type: "text",
          key: generateKey(),
          scope,
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

    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    // If it's a standalone text node, wrap it in a paragraph
    return {
      type: "paragraph",
      key: generateKey(),
      scope,
      children: [
        {
          type: "text",
          key: generateKey(),
          scope,
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
    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    return {
      type: "paragraph",
      key: generateKey(),
      scope,
      children: [
        {
          type: "text",
          key: generateKey(),
          scope,
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
    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    return {
      type: "text",
      key: generateKey(),
      scope,
      value: `\`${node.value || ""}\``,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "thematicBreak") {
    // Horizontal rule - convert to text
    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    return {
      type: "text",
      key: generateKey(),
      scope,
      value: "---",
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "mdxFlowExpression") {
    // MDX expression outside JSX - create an expression node
    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    return {
      type: "expression",
      key: generateKey(),
      scope,
      value: node.value,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "blockquote") {
    // Convert blockquotes to text
    const text = extractTextFromNode(node);
    const scope =
      context.currentStates.length > 0
        ? ["root", ...context.currentStates]
        : ["root"];

    return {
      type: "paragraph",
      key: generateKey(),
      scope,
      children: [
        {
          type: "text",
          key: generateKey(),
          scope,
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
  diagnostics.add({
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
