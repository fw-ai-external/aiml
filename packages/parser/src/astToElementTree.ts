import {
  type Diagnostic,
  DiagnosticSeverity,
  type SerializedBaseElement,
  aimlElements,
} from "@aiml/shared";
import { validateAttributes } from "./validateAttributes.js";

interface ParserContext {
  currentStates: string[];
  datamodel: Map<
    string,
    Record<string, import("@aiml/shared").FieldDefinition>
  >;
}
import { generateKey } from "./utils/helpers.js";
import {
  buildDatamodelFromAST,
  validateAssignElements,
} from "./validateAssignElements.js";
import { allElementConfigs, type ElementDefinition } from "@aiml/shared";
import type { AIMLASTNode } from "./ast/aiml/aiml.js";

// Helper to get tag name from AIMLElement attributes
function getTagName(node: AIMLASTNode): string | undefined {
  if (node.type === "AIMLElement" && node.attributes) {
    const tagNameNode = node.attributes.find((attr) => attr.type === "TagName");
    return tagNameNode?.content as string | undefined;
  }
  return undefined;
}

/**
 * Process attributes from an AST node into a record
 */
export function processAttributes(
  attributes: AIMLASTNode[] | undefined
): Record<string, any> {
  if (!attributes || !Array.isArray(attributes)) {
    return {};
  }

  const result: Record<string, any> = {};

  for (const attr of attributes) {
    if (attr.type === "Prop") {
      if (
        !attr.content &&
        typeof attr.content !== "boolean" &&
        typeof attr.content !== "number"
      ) {
        result[attr.name!] = true;
        continue;
      }

      switch (attr.contentType) {
        case "string":
          result[attr.name!] = attr.content;
          break;
        case "expression":
          result[attr.name!] =
            `::FUNCTION-EXPRESSION::(context) => { const ctx = context; return ${attr.content}}`;
          break;
        case "boolean":
          result[attr.name!] = Boolean(attr.content);
          break;
        case "number":
          result[attr.name!] = attr.content;
          break;
        case "object":
        case "array":
          result[attr.name!] = attr.content;
          break;
        case "function":
          result[attr.name!] = `::FUNCTION::${attr.content}`;
          break;
        default:
          result[attr.name!] = attr.content;
          break;
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
      if (child.astSourceType === "text") {
        promptText += (child as import("@aiml/shared").TextNode).value;
      } else if (child.astSourceType === "expression") {
        promptText += `\${${(child as import("@aiml/shared").ExpressionNode).value}}`;
      } else {
        console.warn(`${child.astSourceType} - ${child.value}`);
      }
    }
  } else {
    promptText = paragraphNode.value as string;
  }

  return {
    astSourceType: "element",
    key: generateKey(),
    tag: "llm",
    type: "action",
    subType: "model",
    scope,
    attributes: {
      prompt: "${input}",
      instructions: promptText,
      model: "accounts/fireworks/models/llama-v3p1-8b-instruct",
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
  ast: AIMLASTNode[],
  options: any
): {
  nodes: SerializedBaseElement[];
  diagnostics: Set<Diagnostic>;
  datamodel: Record<string, import("@aiml/shared").DataModel>;
} {
  const nodes: SerializedBaseElement[] = [];
  const diagnostics = new Set<Diagnostic>();
  const context: ParserContext = {
    currentStates: [],
    datamodel: new Map(),
  };

  // Process root node's children
  for (const child of ast) {
    const transformed = astToElementTree(child, options, diagnostics, context);
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
      if (fieldDef && typeof fieldDef === "object" && fieldDef !== null) {
        context.datamodel.get(scope)![fieldName] = {
          type: fieldDef.type as import("@aiml/shared").FieldType,
          readonly: fieldDef.readonly,
          fromRequest: fieldDef.fromRequest,
          defaultValue: fieldDef.defaultValue,
          schema: fieldDef.schema,
        };
      } else {
        diagnostics.add({
          message: `Invalid definition for <data id="${fieldName}"> in builtDatamodel`,
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

  // Convert RuntimeFieldDefinition to DataModel format
  const convertedDatamodel: Record<string, import("@aiml/shared").DataModel> =
    {};
  for (const [scope, fields] of context.datamodel.entries()) {
    convertedDatamodel[scope] = {};
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      if (fieldDef) {
        convertedDatamodel[scope][fieldName] = {
          type: fieldDef.type as import("@aiml/shared").FieldType,
          readonly: fieldDef.readonly,
          fromRequest: fieldDef.fromRequest,
          defaultValue: fieldDef.defaultValue,
          schema: fieldDef.schema,
        };
      } else {
        diagnostics.add({
          message: `Invalid definition for <data id="${fieldName}"> in context datamodel`,
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
 * @param context Parser context
 * @returns Transformed AIML node or null
 */
export function astToElementTree(
  node: AIMLASTNode,
  options: any,
  diagnostics: Set<Diagnostic>,
  context: ParserContext
): SerializedBaseElement | null {
  const { lineStart, columnStart, lineEnd, columnEnd } = node;
  const currentScope =
    context.currentStates.length > 0 ? [...context.currentStates] : ["root"];

  if (node.type === "AIMLElement") {
    const tagName = getTagName(node)?.toLowerCase();

    if (!tagName) {
      diagnostics.add({
        message: `AIML element missing tag name.`,
        severity: DiagnosticSeverity.Error,
        code: "AIML015",
        source: "aiml-parser",
        range: {
          start: { line: lineStart, column: columnStart },
          end: { line: lineEnd, column: columnEnd },
        },
      });
      return null;
    }

    const processedAttributes = processAttributes(node.attributes);

    const isValidAimlElement = aimlElements.includes(tagName as any);

    if (!isValidAimlElement) {
      diagnostics.add({
        message: `Unknown element <${tagName}> will be skipped`,
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

    const mockNodeForValidation = {
      name: tagName,
      children: node.children,
      position: {
        start: { line: lineStart, column: columnStart },
        end: { line: lineEnd, column: columnEnd },
      },
    };

    validateAttributes(
      mockNodeForValidation as any,
      processedAttributes,
      diagnostics
    );

    const nodeConfig: ElementDefinition | undefined =
      allElementConfigs[tagName as keyof typeof allElementConfigs];

    if (!nodeConfig) {
      diagnostics.add({
        message: `No configuration found for element <${tagName}>.`,
        severity: DiagnosticSeverity.Error,
        code: "AIML016",
        source: "aiml-parser",
        range: {
          start: { line: lineStart, column: columnStart },
          end: { line: lineEnd, column: columnEnd },
        },
      });
      return null;
    }

    let stateId: string | undefined;
    if (nodeConfig.tag === "workflow" && context.currentStates.length === 0) {
      context.currentStates.push("root");
    }

    if (nodeConfig.type === "state" && nodeConfig.tag !== "workflow") {
      stateId = processedAttributes.id;
      if (
        !stateId &&
        nodeConfig.subType !== "user-input" &&
        nodeConfig.subType !== "output" &&
        nodeConfig.subType !== "error"
      ) {
        stateId = `anonymous_state_${generateKey()}`;
        diagnostics.add({
          message: `State element <${tagName}> missing ID - generated: ${stateId}`,
          severity: DiagnosticSeverity.Warning,
          code: "AIML005",
          source: "aiml-parser",
          range: {
            start: { line: lineStart, column: columnStart },
            end: { line: lineEnd, column: columnEnd },
          },
        });
      }
      if (stateId) {
        context.currentStates.push(stateId);
      }
    }

    const isData = tagName === "data";
    if (isData) {
      const attrs = processedAttributes;
      const fieldName = attrs.id || `data_${generateKey()}`;
      let defaultValueString = "";
      if (node.children && node.children.length > 0) {
        const firstChild = node.children[0];
        if (firstChild.type === "Text") {
          defaultValueString = (firstChild.content as string) || "";
        }
        if (node.children.length > 1) {
          diagnostics.add({
            message: `<data> element should only have a single text node child for default value.`,
            severity: DiagnosticSeverity.Warning,
            code: "AIML017",
            source: "aiml-parser",
            range: {
              start: { line: lineStart, column: columnStart },
              end: { line: lineEnd, column: columnEnd },
            },
          });
        }
      }

      let typedDefaultValue: any = defaultValueString;
      try {
        typedDefaultValue =
          attrs.type === "json" && defaultValueString
            ? JSON.parse(defaultValueString)
            : attrs.type === "number" && defaultValueString
              ? defaultValueString.includes(".")
                ? parseFloat(defaultValueString)
                : parseInt(defaultValueString)
              : attrs.type === "boolean"
                ? defaultValueString === "false" || defaultValueString === ""
                  ? false
                  : true
                : defaultValueString;
      } catch (e) {
        diagnostics.add({
          message: `Error parsing default value "${defaultValueString}" into type ${attrs.type} for ${fieldName}: ${e}`,
          severity: DiagnosticSeverity.Warning,
          code: "AIML006",
          source: "aiml-parser",
          range: {
            start: { line: lineStart, column: columnStart },
            end: { line: lineEnd, column: columnEnd },
          },
        });
      }

      const fieldDef: import("@aiml/shared").FieldDefinition = {
        type: attrs.type || "string",
        readonly: !!attrs.readonly,
        fromRequest: !!attrs.fromRequest,
        defaultValue: typedDefaultValue,
        schema:
          attrs.type === "string"
            ? { type: "string" }
            : attrs.type === "number"
              ? { type: "number" }
              : attrs.type === "boolean"
                ? { type: "boolean" }
                : attrs.type === "json"
                  ? attrs.schema || {}
                  : { type: "string" },
      };
      const scopeKey = context.currentStates.join(".") || "root";

      if (!context.datamodel.has(scopeKey)) {
        context.datamodel.set(scopeKey, {});
      }
      context.datamodel.get(scopeKey)![fieldName] = fieldDef;
    }

    const children =
      node.children
        ?.map((childNode: AIMLASTNode) =>
          astToElementTree(childNode, options, diagnostics, context)
        )
        .filter((child): child is SerializedBaseElement => Boolean(child)) ||
      [];

    if (
      nodeConfig.type === "state" &&
      nodeConfig.tag !== "workflow" &&
      stateId
    ) {
      if (context.currentStates[context.currentStates.length - 1] === stateId) {
        context.currentStates.pop();
      } else {
        diagnostics.add({
          message: `Scope management error: trying to pop ${stateId}, but current state is ${context.currentStates[context.currentStates.length - 1]}.`,
          severity: DiagnosticSeverity.Warning,
          code: "AIML018",
          source: "aiml-parser",
          range: {
            start: { line: lineStart, column: columnStart },
            end: { line: lineEnd, column: columnEnd },
          },
        });
      }
    }

    if (
      nodeConfig.tag === "workflow" &&
      processedAttributes.id === "root" &&
      context.currentStates[context.currentStates.length - 1] === "root"
    ) {
    }

    return {
      astSourceType: "element",
      key: generateKey(),
      tag: nodeConfig.tag,
      scope: currentScope,
      type: nodeConfig.type || "action",
      subType: nodeConfig.subType,
      attributes: {
        ...processedAttributes,
        ...(nodeConfig.type === "state" && stateId ? { id: stateId } : {}),
      },
      children,
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
    };
  } else if (node.type === "Text") {
    if ((node.content as string)?.trim() === "") {
      return null;
    }
    return {
      astSourceType: "text",
      key: generateKey(),
      scope: currentScope,
      value: node.content as string,
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
    };
  } else if (node.type === "Expression") {
    return {
      astSourceType: "expression",
      key: generateKey(),
      scope: currentScope,
      value: node.content as string,
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
    };
  } else if (node.type === "Frontmatter") {
    const fields: SerializedBaseElement[] = [];
    if (node.children) {
      for (const pair of node.children) {
        if (pair.type === "FrontmatterPair" && pair.name) {
          fields.push({
            astSourceType: "headerField",
            key: generateKey(),
            scope: ["root"],
            id: pair.name,
            value: pair.content as string,
            lineStart: pair.lineStart,
            lineEnd: pair.lineEnd,
            columnStart: pair.columnStart,
            columnEnd: pair.columnEnd,
          });
        }
      }
    }
    return {
      astSourceType: "header",
      key: generateKey(),
      scope: ["root"],
      children: fields,
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
    };
  } else if (node.type === "Import") {
    const importVariableNode = node.children?.find(
      (c) => c.type === "ImportVariable"
    );
    const moduleNameNode = node.children?.find((c) => c.type === "ModuleName");

    const defaultImport = importVariableNode?.content as string | undefined;
    const source = moduleNameNode?.content as string | undefined;

    if (source) {
      return {
        astSourceType: "import",
        key: generateKey(),
        scope: ["root"],
        filePath: source,
        defaultImport: defaultImport,
        lineStart,
        lineEnd,
        columnStart,
        columnEnd,
      };
    }
    return null;
  } else if (node.type === "Comment") {
    return null;
  }

  console.warn(`Unsupported node type: ${node.type}`);
  diagnostics.add({
    message: `Unsupported node type: ${node.type}`,
    severity: DiagnosticSeverity.Information,
    code: "AIML004",
    source: "aiml-parser",
    range: {
      start: {
        line: lineStart,
        column: columnStart,
      },
      end: {
        line: lineEnd,
        column: columnEnd,
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
    if (
      nodes[i]?.astSourceType === "text" &&
      nodes[i + 1]?.astSourceType === "text"
    ) {
      const currentNode = nodes[i] as import("@aiml/shared").TextNode;
      const nextNode = nodes[i + 1] as import("@aiml/shared").TextNode;

      const currentValue =
        typeof currentNode.value === "string"
          ? currentNode.value
          : String(currentNode.value || "");
      const nextValue =
        typeof nextNode.value === "string"
          ? nextNode.value
          : String(nextNode.value || "");
      currentNode.value = currentValue + nextValue;

      currentNode.lineEnd = nextNode.lineEnd;
      currentNode.columnEnd = nextNode.columnEnd;

      nodes.splice(i + 1, 1);

      i--;
    }
  }
}
