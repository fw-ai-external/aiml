import { visit } from "unist-util-visit";
import { Diagnostic, DiagnosticSeverity } from "@fireworks/types";
import { ValueType } from "@fireworks/types";

/**
 * Interface for variable metadata
 */
interface VariableMetadata {
  type: ValueType | string;
  readonly: boolean;
  id: string;
  fromRequest: boolean;
  parentStateId: string | null;
}

/**
 * Interface for datamodel
 */
interface Datamodel {
  __metadata?: Record<string, VariableMetadata>;
  [key: string]: any;
}

/**
 * Validates assign elements against the datamodel
 * @param ast The AST to validate
 * @param datamodel The datamodel to validate against
 * @returns An array of diagnostics
 */
export function validateAssignElements(
  ast: any,
  datamodel: Datamodel
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Visit all assign elements in the AST
  visit(ast, (node) => {
    if (node.type === "element" && node.tag === "assign") {
      const { location, expr } = node.attributes;

      // Check if location is provided
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

      // Check if the variable exists in the datamodel
      const metadata = datamodel.__metadata?.[location];
      if (!metadata) {
        diagnostics.push(
          createDiagnostic(
            node,
            `Variable '${location}' does not exist in datamodel`,
            DiagnosticSeverity.Error
          )
        );
        return;
      }

      // Check if the variable is readonly
      if (metadata.readonly) {
        diagnostics.push(
          createDiagnostic(
            node,
            `Cannot assign to readonly variable '${location}'`,
            DiagnosticSeverity.Error
          )
        );
      }

      // Check type compatibility if expr is provided
      if (expr && metadata.type) {
        try {
          // Simple type inference for common literals
          const inferredType = inferExpressionType(expr);
          if (inferredType && !isTypeCompatible(inferredType, metadata.type)) {
            diagnostics.push(
              createDiagnostic(
                node,
                `Type mismatch: cannot assign ${inferredType} to ${metadata.type}`,
                DiagnosticSeverity.Error
              )
            );
          }
        } catch (error) {
          // If type inference fails, add a warning
          diagnostics.push(
            createDiagnostic(
              node,
              `Could not validate type compatibility for '${location}'`,
              DiagnosticSeverity.Warning
            )
          );
        }
      }

      // Check scope access
      const currentStateId = findCurrentStateId(node);
      if (!isInScope(location, currentStateId, datamodel)) {
        diagnostics.push(
          createDiagnostic(
            node,
            `Variable '${location}' is not accessible from current scope`,
            DiagnosticSeverity.Error
          )
        );
      }
    }
  });

  return diagnostics;
}

/**
 * Creates a diagnostic for a node
 */
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

/**
 * Infers the type of an expression
 * @param expr The expression to infer the type of
 * @returns The inferred type or undefined
 */
function inferExpressionType(expr: string): ValueType | undefined {
  // Simple type inference for common literals
  if (expr.match(/^['"].*['"]$/)) {
    return ValueType.STRING;
  } else if (expr.match(/^-?\d+(\.\d+)?$/)) {
    return ValueType.NUMBER;
  } else if (expr === "true" || expr === "false") {
    return ValueType.BOOLEAN;
  } else if (expr.match(/^\{.*\}$/)) {
    return ValueType.OBJECT;
  } else if (expr.match(/^\[.*\]$/)) {
    return ValueType.ARRAY;
  }
  return undefined;
}

/**
 * Checks if two types are compatible
 * @param sourceType The source type
 * @param targetType The target type
 * @returns True if the types are compatible
 */
function isTypeCompatible(
  sourceType: ValueType,
  targetType: ValueType | string
): boolean {
  // For now, just check if they're the same
  return sourceType === targetType;
}

/**
 * Finds the current state ID for a node
 * @param node The node to find the state ID for
 * @returns The state ID or null
 */
function findCurrentStateId(node: any): string | null {
  // Traverse up the tree to find the parent state
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

/**
 * Checks if a variable is in scope
 * @param variableId The variable ID
 * @param currentStateId The current state ID
 * @param datamodel The datamodel
 * @returns True if the variable is in scope
 */
function isInScope(
  variableId: string,
  currentStateId: string | null,
  datamodel: Datamodel
): boolean {
  const metadata = datamodel.__metadata?.[variableId];
  if (!metadata) {
    return false;
  }

  const variableParentStateId = metadata.parentStateId;

  // If no parent state ID (root level datamodel), it's globally accessible
  if (!variableParentStateId) {
    return true;
  }

  // If no current state ID, assume it's accessible
  if (!currentStateId) {
    return true;
  }

  // Check if the current state is the same as or a descendant of the variable's parent state
  // This is a simplified check - in a real implementation, we would need to traverse the state hierarchy
  return currentStateId === variableParentStateId;
}

/**
 * Builds a datamodel from an AST
 * @param ast The AST to build the datamodel from
 * @returns A datamodel object
 */
export function buildDatamodelFromAST(ast: any): Datamodel {
  const datamodel: Datamodel = { __metadata: {} };

  // Visit all data elements in the AST
  visit(ast, (node) => {
    if (node.type === "element" && node.tag === "data") {
      const { id, type, readonly, fromRequest } = node.attributes;

      if (id) {
        // Add metadata for the data element
        datamodel.__metadata![id] = {
          id,
          type: type || ValueType.STRING,
          readonly: readonly === true || fromRequest === true,
          fromRequest: fromRequest === true,
          parentStateId: findParentStateId(node),
        };
      }
    }
  });

  return datamodel;
}

/**
 * Finds the parent state ID for a node
 * @param node The node to find the parent state ID for
 * @returns The parent state ID or null
 */
function findParentStateId(node: any): string | null {
  // Traverse up the tree to find the parent state
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
