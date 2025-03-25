import { type Diagnostic, DiagnosticSeverity } from "@fireworks/shared";
import { ValueType } from "@fireworks/shared";
import { visit } from "unist-util-visit";

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

export function validateAssignElements(
  ast: any,
  datamodel: Datamodel
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  visit(ast, "element", (node) => {
    if (node.tag === "assign") {
      const { location, expr } = node.attributes || {};

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

      if (expr && fieldDef.type) {
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

export function buildDatamodelFromAST(ast: any): Datamodel {
  const datamodel: Datamodel = {};

  visit(ast, "element", (node) => {
    if (node.tag === "data") {
      const {
        id,
        type,
        readonly,
        fromRequest,
        default: defaultValue,
      } = node.attributes || {};
      const parentStateId = findParentStateId(node);
      const scope = parentStateId ? `root.${parentStateId}` : "root";

      if (id) {
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
