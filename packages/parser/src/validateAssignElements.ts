import { type Diagnostic, DiagnosticSeverity } from "@aiml/shared";
import { ValueType } from "@aiml/shared";
import { type AIMLASTNode } from "./ast/aiml/aiml.js";

interface FieldDefinition {
  type: ValueType | string;
  readonly: boolean;
  fromRequest: boolean;
  schema: Record<string, any>;
  defaultValue: any;
  parentStateId?: string;
}

interface Datamodel {
  [scope: string]: Record<string, FieldDefinition>;
}

// Helper to get tag name from AIMLElement attributes
function getTagName(node: AIMLASTNode): string | undefined {
  if (node.type === "AIMLElement" && node.attributes) {
    const tagNameNode = node.attributes.find((attr) => attr.type === "TagName");
    return tagNameNode?.content as string | undefined;
  }
  return undefined;
}

// Helper to get attributes from AIMLElement
function getElementAttributes(node: AIMLASTNode): Record<string, any> {
  const attrs: Record<string, any> = {};
  if (node.type === "AIMLElement" && node.attributes) {
    node.attributes.forEach((attr) => {
      if (attr.type === "Prop" && attr.name) {
        attrs[attr.name] = attr.content ?? true; // Handle boolean attributes
      }
    });
  }
  return attrs;
}

// Custom visitor function
function visitAIMLNodes(
  nodes: AIMLASTNode | AIMLASTNode[] | undefined,
  visitor: (node: AIMLASTNode) => void
) {
  if (!nodes) {
    return;
  }
  const nodeList = Array.isArray(nodes) ? nodes : [nodes];
  for (const node of nodeList) {
    visitor(node);
    if (node.children) {
      visitAIMLNodes(node.children, visitor);
    }
    // Also visit attributes if they are AIMLASTNodes (though typically Props are simple)
    // For now, assuming attributes don't contain deeply nested visitable structures relevant here.
  }
}

// TODO: do this based on the final Element Tree not the AST
// TODO: This should be part of a larger flow that also checks expressions and scripts for type safety
export function validateAssignElements(
  ast: AIMLASTNode[],
  datamodel: Datamodel
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  visitAIMLNodes(ast, (node) => {
    if (node.type === "AIMLElement" && getTagName(node) === "assign") {
      const attributes = getElementAttributes(node);
      const { location, expr } = attributes;

      if (!location) {
        diagnostics.push(
          createDiagnostic(
            node,
            "Assign element requires a 'location' attribute",
            DiagnosticSeverity.Error
          )
        );
        return;
      }

      const currentStateId = findCurrentStateId(node);
      let fieldDef: FieldDefinition | undefined;

      const currentScope = currentStateId ? `root.${currentStateId}` : "root";
      fieldDef = datamodel[currentScope]?.[location];

      if (!fieldDef) {
        const scopes = Object.keys(datamodel);
        for (const scope of scopes) {
          if (scope.startsWith(currentScope) && datamodel[scope][location]) {
            fieldDef = datamodel[scope][location];
            break;
          }
        }
      }

      if (!fieldDef) {
        fieldDef = datamodel.root?.[location];
      }

      if (!fieldDef) {
        diagnostics.push(
          createDiagnostic(
            node,
            `Variable '${location}' does not exist in datamodel`,
            DiagnosticSeverity.Error
          )
        );
        return;
      }

      if (fieldDef.readonly) {
        diagnostics.push(
          createDiagnostic(
            node,
            `Cannot assign to readonly variable '${location}'`,
            DiagnosticSeverity.Error
          )
        );
      }

      if (expr && typeof expr === "string" && fieldDef.type) {
        try {
          const inferredType = inferExpressionType(expr);
          if (inferredType && !isTypeCompatible(inferredType, fieldDef.type)) {
            diagnostics.push(
              createDiagnostic(
                node,
                `Type mismatch: cannot assign ${inferredType} to ${fieldDef.type}`,
                DiagnosticSeverity.Error
              )
            );
          }
        } catch (error) {
          diagnostics.push(
            createDiagnostic(
              node,
              `Could not validate type compatibility for '${location}'`,
              DiagnosticSeverity.Warning
            )
          );
        }
      }
    }
  });

  return diagnostics;
}

function createDiagnostic(
  node: any,
  message: string,
  severity: DiagnosticSeverity
): Diagnostic {
  return {
    message,
    severity,
    code: "AIML-ASSIGN",
    source: "AIML",
    range: {
      start: {
        line: node.lineStart,
        column: node.columnStart,
      },
      end: {
        line: node.lineEnd,
        column: node.columnEnd,
      },
    },
  };
}

function inferExpressionType(expr: string): ValueType | undefined {
  if (expr.match(/^['"].*['"]$/)) return ValueType.STRING;
  if (expr.match(/^-?\d+(\.\d+)?$/)) return ValueType.NUMBER;
  if (expr === "true" || expr === "false") return ValueType.BOOLEAN;
  if (expr.match(/^\{.*\}$/) || expr.match(/^\[.*\]$/)) return ValueType.JSON;
  return undefined;
}

function isTypeCompatible(
  sourceType: ValueType,
  targetType: ValueType | string
): boolean {
  return sourceType === targetType;
}

function findCurrentStateId(node: any): string | null {
  let current = node;
  while (current && current.parent) {
    current = current.parent;
    if (
      current.type === "element" &&
      (current.tag === "state" ||
        current.tag === "workflow" ||
        current.tag === "final" ||
        current.tag === "initial")
    ) {
      return current.attributes.id || null;
    }
  }
  return null;
}

function isInScope(
  variableId: string,
  currentStateId: string | null,
  datamodel: Datamodel
): boolean {
  const currentScope = currentStateId ? `root.${currentStateId}` : "root";
  if (datamodel[currentScope]?.[variableId]) return true;

  const scopes = Object.keys(datamodel);
  for (const scope of scopes) {
    if (scope.startsWith(currentScope) && datamodel[scope][variableId]) {
      return true;
    }
  }

  return !!datamodel.root?.[variableId];
}

export function buildDatamodelFromAST(ast: AIMLASTNode[]): Datamodel {
  const datamodel: Datamodel = {};

  visitAIMLNodes(ast, (node) => {
    if (node.type === "AIMLElement" && getTagName(node) === "data") {
      const attributes = getElementAttributes(node);
      const {
        id,
        type,
        readonly,
        fromRequest,
        default: defaultValue,
      } = attributes;
      const parentStateId = findParentStateId(node);
      const scope = parentStateId ? `root.${parentStateId}` : "root";

      if (id && typeof id === "string") {
        if (!datamodel[scope]) datamodel[scope] = {};

        datamodel[scope][id] = {
          type: type || ValueType.STRING,
          readonly: readonly === true || fromRequest === true,
          fromRequest: fromRequest === true,
          schema:
            type === "string"
              ? { type: "string" }
              : type === "number"
                ? { type: "number" }
                : type === "boolean"
                  ? { type: "boolean" }
                  : type === "json"
                    ? {}
                    : { type: "string" },
          defaultValue,
          ...(parentStateId ? { parentStateId } : {}),
        };
      }
    }
  });

  return datamodel;
}

function findParentStateId(node: any): string | null {
  let current = node;
  while (current && current.parent) {
    current = current.parent;
    if (
      current.type === "element" &&
      (current.tag === "state" ||
        current.tag === "workflow" ||
        current.tag === "final" ||
        current.tag === "initial")
    ) {
      return current.attributes.id || null;
    }
  }
  return null;
}
