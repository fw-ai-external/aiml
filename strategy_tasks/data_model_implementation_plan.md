# Data and DataModel Elements Implementation Plan

## Overview

This plan outlines the implementation of enhanced data and datamodel elements that define shape, type, and scope of context. The ElementExecutionContext will be updated to respect scope and type validations, and the assign element will be modified to respect readonly properties. The parser will also be enhanced to provide diagnostic errors for type mismatches and scope violations.

## Current State Analysis

Based on code review, we have:

1. **BaseElement**: Foundation for all elements with basic properties and execution logic.
2. **DataElement**: Simple implementation that loads data from sources but lacks type validation, scope, and readonly properties.
3. **DataModelElement**: Container for data elements without validation capabilities.
4. **AssignElement**: Updates datamodel values without checking for readonly properties.
5. **ElementExecutionContext**: Manages execution context but doesn't validate scope or types.
6. **Parser**: Processes AIML files but doesn't validate assign elements for type mismatches or scope violations.

## Implementation Goals

1. Enhance DataElement to define shape, type, and scope of context
2. Add readonly property support to DataElement
3. Update DataModelElement to validate the model and enforce type constraints
4. Enhance ElementExecutionContext to respect scope and type validations
5. Update AssignElement to check for readonly properties before updating values
6. Enhance Parser to provide diagnostic errors for assign elements with type mismatches or scope violations

## Detailed Implementation Plan

### 1. Update DataElement

```typescript
// packages/elements/src/context/DataElement.tsx
import { z } from "zod";
import { createElementDefinition } from "../createElementFactory";
import type { BaseElement } from "@fireworks/shared";
import type { ElementExecutionContext } from "@fireworks/shared";
import { StepValue } from "@fireworks/shared";

// Define value type enum
export enum ValueType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  OBJECT = "object",
  ARRAY = "array",
}

const dataSchema = z
  .object({
    id: z.string().optional(),
    expr: z.string().optional(),
    content: z.string().optional(),
    type: z
      .enum([
        ValueType.STRING,
        ValueType.NUMBER,
        ValueType.BOOLEAN,
        ValueType.OBJECT,
        ValueType.ARRAY,
      ])
      .default(ValueType.STRING),
    readonly: z.boolean().default(false),
    fromRequest: z.boolean().default(false),
    defaultValue: z.any().optional(),
  })
  .refine(
    (data) => {
      // Either fromRequest must be true or expr must be set
      return data.fromRequest === true || !!data.expr;
    },
    {
      message: "Either fromRequest must be true or expr must be set",
      path: ["fromRequest", "expr"],
    }
  );

type DataProps = z.infer<typeof dataSchema>;

export const Data = createElementDefinition({
  tag: "data",
  propsSchema: dataSchema,
  role: "state",
  elementType: "data",
  allowedChildren: "none",
  async execute(
    ctx: ElementExecutionContext<DataProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue> {
    const { id, expr, content, type, readonly, fromRequest, defaultValue } =
      ctx.attributes;

    // If fromRequest is true, readonly should also be true
    const isReadonly = readonly || fromRequest;

    if (!id) {
      throw new Error("Data element requires an 'id' attribute");
    }

    try {
      let value;
      if (expr) {
        // Evaluate expression and assign result
        value = new Function(
          "datamodel",
          `with(datamodel) { return ${expr}; }`
        )(ctx.datamodel);
      } else if (content) {
        // If no src or expr, use the text content as a JSON string
        const textContent = content.trim();
        value = textContent ? JSON.parse(textContent) : null;
      } else if (defaultValue !== undefined) {
        // Use default value if provided
        value = defaultValue;
      } else if (fromRequest) {
        // Get value from the request context
        value = ctx.workflowInput.userMessage;
      } else {
        // This should not happen due to the schema refinement, but just in case
        throw new Error("Either fromRequest must be true or expr must be set");
      }

      // Validate value against type
      const validatedValue = validateValueType(value, type);

      // Store metadata about the data element
      const metadata = {
        type,
        readonly: isReadonly, // Use the calculated readonly value
        id,
        fromRequest,
        // Track the parent state ID for scope determination
        parentStateId: this.getParentStateId(ctx),
      };

      // Store the value in the datamodel with its metadata
      ctx.datamodel[id] = validatedValue;

      // Store metadata in a special namespace
      if (!ctx.datamodel.__metadata) {
        ctx.datamodel.__metadata = {};
      }
      ctx.datamodel.__metadata[id] = metadata;

      return new StepValue({
        type: "object",
        object: { id, value: validatedValue, metadata },
      });
    } catch (error) {
      return new StepValue({
        type: "error",
        code: "DATA_ERROR",
        error: `Failed to process data element: ${error}`,
      });
    }
  },
});

// Helper function to validate value against type
function validateValueType(value: any, type: ValueType): any {
  switch (type) {
    case ValueType.STRING:
      if (typeof value !== "string") {
        throw new Error(`Value must be a string, got ${typeof value}`);
      }
      return value;
    case ValueType.NUMBER:
      if (typeof value !== "number" || isNaN(value)) {
        throw new Error(`Value must be a number, got ${typeof value}`);
      }
      return value;
    case ValueType.BOOLEAN:
      if (typeof value !== "boolean") {
        throw new Error(`Value must be a boolean, got ${typeof value}`);
      }
      return value;
    case ValueType.OBJECT:
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Value must be an object, got ${typeof value}`);
      }
      return value;
    case ValueType.ARRAY:
      if (!Array.isArray(value)) {
        throw new Error(`Value must be an array, got ${typeof value}`);
      }
      return value;
    case ValueType.ANY:
    default:
      return value;
  }
}
```

### 2. Update DataModelElement

```typescript
// packages/elements/src/context/DataModelElement.ts
import { z } from "zod";
import { createElementDefinition } from "../createElementFactory";
import type { ElementExecutionContext } from "@fireworks/shared";
import { StepValue } from "@fireworks/shared";
import type { BaseElement } from "@fireworks/shared";
import { ValueType } from "./DataElement";

const dataModelSchema = z.object({
  id: z.string().optional(),
});

type DataModelProps = z.infer<typeof dataModelSchema>;

export const DataModel = createElementDefinition({
  tag: "datamodel",
  propsSchema: dataModelSchema,
  role: "state",
  elementType: "datamodel",
  allowedChildren: ["data"],

  async execute(
    ctx: ElementExecutionContext<DataModelProps>,
    childrenNodes: BaseElement[]
  ): Promise<StepValue> {
    try {
      // Initialize data elements
      const dataElements = childrenNodes.filter(
        (child) => child.elementType === "data"
      );

      // Initialize metadata structure if it doesn't exist
      if (!ctx.datamodel.__metadata) {
        ctx.datamodel.__metadata = {};
      }

      // Process all data elements
      for (const data of dataElements) {
        await initializeDataElement(data, ctx);
      }

      // Validate the entire model
      validateDataModel(ctx);

      return new StepValue({
        type: "object",
        object: { initialized: true },
      });
    } catch (error) {
      console.error("Error in datamodel element:", error);
      return new StepValue({
        type: "error",
        code: "DATAMODEL_ERROR",
        error: `Failed to initialize datamodel: ${error}`,
      });
    }
  },
});

async function initializeDataElement(
  element: BaseElement,
  ctx: ElementExecutionContext<DataModelProps>
): Promise<void> {
  const id = element.id;
  const expr = element.attributes["expr"];
  const type = element.attributes["type"] || ValueType.STRING;
  const readonly = element.attributes["readonly"] || false;
  const fromRequest = element.attributes["fromRequest"] || false;
  const defaultValue = element.attributes["defaultValue"];

  // If fromRequest is true, readonly should also be true
  const isReadonly = readonly || fromRequest;

  let value;

  if (expr) {
    try {
      // Create a function that evaluates expressions in the context of the datamodel
      const fn = new Function(...Object.keys(ctx.datamodel), `return ${expr}`);
      value = fn(...Object.values(ctx.datamodel));
    } catch (error) {
      console.error(
        `Error evaluating expression for data element ${id}:`,
        error
      );
      value = defaultValue;
    }
  } else if (fromRequest) {
    // Get value from the request context
    try {
      value = ctx.workflowInput.userMessage;
    } catch (error) {
      console.error(
        `Error getting value from request for data element ${id}:`,
        error
      );
      value = defaultValue;
    }
  } else {
    // This should not happen due to the schema refinement, but just in case
    console.error(
      `Either fromRequest must be true or expr must be set for data element ${id}`
    );
    value = defaultValue;
  }

  // Validate value against type
  try {
    validateValueType(value, type);
  } catch (error) {
    console.error(`Type validation error for data element ${id}:`, error);
    // Use default value if type validation fails
    value = getDefaultForType(type);
  }

  // Store the value in the datamodel
  ctx.datamodel[id] = value;

  // Store metadata
  ctx.datamodel.__metadata[id] = {
    type,
    readonly: isReadonly, // Use the calculated readonly value
    id,
    fromRequest,
    // Track the parent state ID for scope determination
    parentStateId: getParentStateId(element),
  };
}

function validateDataModel(ctx: ElementExecutionContext<DataModelProps>): void {
  // Check for duplicate IDs
  const ids = Object.keys(ctx.datamodel.__metadata);
  const uniqueIds = new Set(ids);

  if (uniqueIds.size !== ids.length) {
    throw new Error("Duplicate data element IDs found in datamodel");
  }

  // Additional validation logic can be added here
}

function validateValueType(value: any, type: ValueType): any {
  // Implementation same as in DataElement
  switch (type) {
    case ValueType.STRING:
      if (typeof value !== "string") {
        throw new Error(`Value must be a string, got ${typeof value}`);
      }
      return value;
    case ValueType.NUMBER:
      if (typeof value !== "number" || isNaN(value)) {
        throw new Error(`Value must be a number, got ${typeof value}`);
      }
      return value;
    case ValueType.BOOLEAN:
      if (typeof value !== "boolean") {
        throw new Error(`Value must be a boolean, got ${typeof value}`);
      }
      return value;
    case ValueType.OBJECT:
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Value must be an object, got ${typeof value}`);
      }
      return value;
    case ValueType.ARRAY:
      if (!Array.isArray(value)) {
        throw new Error(`Value must be an array, got ${typeof value}`);
      }
      return value;
    case ValueType.ANY:
    default:
      return value;
  }
}

function getDefaultForType(type: ValueType): any {
  switch (type) {
    case ValueType.STRING:
      return "";
    case ValueType.NUMBER:
      return 0;
    case ValueType.BOOLEAN:
      return false;
    case ValueType.OBJECT:
      return {};
    case ValueType.ARRAY:
      return [];
    default:
      return ""; // Default to empty string since STRING is the default type
  }
}
```

### 3. Update ElementExecutionContext

The ElementExecutionContext is responsible for providing the datamodel to elements during execution. It needs to be enhanced to respect document-based scoping and type validations.

```typescript
// packages/elements/src/utils/ElementExecutionContext.ts
// Add these methods to the ElementExecutionContext class

export class ElementExecutionContext<
  PropValues extends {},
  InputValue extends RunstepOutput = RunstepOutput,
> {
  // ... existing code ...

  // Build a scoped datamodel for the current context
  buildScopedDatamodel(currentStateId: string): Record<string, any> {
    // Start with an empty datamodel
    const scopedDatamodel: Record<string, any> = {};

    // Add metadata namespace
    scopedDatamodel.__metadata = {};

    // Iterate through all variables in the global datamodel
    for (const [variableId, value] of Object.entries(this.datamodel)) {
      // Skip metadata
      if (variableId === "__metadata") continue;

      // Check if this variable should be accessible in the current scope
      if (this.validateScopeAccess(variableId, currentStateId)) {
        // Add the variable to the scoped datamodel
        scopedDatamodel[variableId] = value;

        // Also copy its metadata
        if (this.datamodel.__metadata?.[variableId]) {
          scopedDatamodel.__metadata[variableId] =
            this.datamodel.__metadata[variableId];
        }
      }
    }

    return scopedDatamodel;
  }

  // Check if a variable can be accessed based on scope
  validateScopeAccess(variableId: string, currentStateId: string): boolean {
    // If metadata doesn't exist or variable doesn't have metadata, allow access
    if (!this.datamodel.__metadata || !this.datamodel.__metadata[variableId]) {
      return true;
    }

    const metadata = this.datamodel.__metadata[variableId];
    const variableParentStateId = metadata.parentStateId;

    // If no parent state ID (root level datamodel), it's globally accessible
    if (!variableParentStateId) {
      return true;
    }

    // Check if the current state is the same as or a descendant of the variable's parent state
    return this.isStateOrDescendant(currentStateId, variableParentStateId);
  }

  // Helper method to check state hierarchy
  private isStateOrDescendant(
    currentStateId: string,
    ancestorStateId: string
  ): boolean {
    // If they're the same state, access is allowed
    if (currentStateId === ancestorStateId) {
      return true;
    }

    // Traverse up the state hierarchy to check if currentState is a descendant of ancestorState
    let current = this.getStateById(currentStateId);
    while (current) {
      const parentId = current.parentStateId;
      if (parentId === ancestorStateId) {
        return true;
      }
      current = this.getStateById(parentId);
    }

    return false;
  }

  // Helper to get a state by ID
  private getStateById(stateId: string): any {
    // Implementation would depend on how states are stored
    // This is a placeholder - actual implementation would access the state registry
    return this.stateRegistry?.[stateId];
  }

  // Check if a variable is readonly
  isReadonly(variableId: string): boolean {
    return this.datamodel.__metadata?.[variableId]?.readonly === true;
  }

  // Validate value against type
  validateType(variableId: string, value: any): boolean {
    if (!this.datamodel.__metadata?.[variableId]) {
      return true; // No metadata, no validation
    }

    const type = this.datamodel.__metadata[variableId].type;

    try {
      switch (type) {
        case "string":
          return typeof value === "string";
        case "number":
          return typeof value === "number" && !isNaN(value);
        case "boolean":
          return typeof value === "boolean";
        case "object":
          return (
            typeof value === "object" && value !== null && !Array.isArray(value)
          );
        case "array":
          return Array.isArray(value);
        default:
          return typeof value === "string"; // Default to string validation
      }
    } catch (error) {
      console.error(`Type validation error for ${variableId}:`, error);
      return false;
    }
  }

  // Update a variable with validation
  updateVariable(
    variableId: string,
    value: any,
    currentStateId: string
  ): boolean {
    // Check if variable exists
    if (!(variableId in this.datamodel)) {
      console.error(`Variable ${variableId} does not exist in datamodel`);
      return false;
    }

    // Check scope access
    if (!this.validateScopeAccess(variableId, currentStateId)) {
      console.error(
        `Variable ${variableId} is not accessible from current scope`
      );
      return false;
    }

    // Check if readonly
    if (this.isReadonly(variableId)) {
      console.error(
        `Variable ${variableId} is readonly and cannot be modified`
      );
      return false;
    }

    // Validate type
    if (!this.validateType(variableId, value)) {
      console.error(`Value for ${variableId} does not match the required type`);
      return false;
    }

    // Update the value
    this.datamodel[variableId] = value;
    return true;
  }

  // Create a new execution context for a child element with the appropriate scoped datamodel
  createChildContext(childStateId: string): ElementExecutionContext {
    // Create a new context with the scoped datamodel
    const scopedDatamodel = this.buildScopedDatamodel(childStateId);

    // Clone the current context with the scoped datamodel
    return new ElementExecutionContext({
      ...this,
      datamodel: scopedDatamodel,
      state: {
        ...this.state,
        id: childStateId,
      },
    });
  }
}
```

### 4. Update AssignElement

```typescript
// packages/elements/src/actions/AssignElement.tsx
import { createElementDefinition, StepValue } from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
import { assignConfig } from "@fireworks/shared";
import type { ElementExecutionContext } from "@fireworks/shared";

// Define the props interface locally based on what's needed
interface AssignAttributes {
  id?: string;
  location?: string;
  expr?: string;
}

// Use any for now to bypass TypeScript's inferred type size limitation
export const Assign: any = createElementDefinition({
  ...assignConfig,
  role: "action",
  elementType: "assign",
  allowedChildren: "none",
  onExecutionGraphConstruction(buildContext: any) {
    return {
      id: buildContext.attributes.id,
      key: buildContext.attributes.id ?? uuidv4(),
      type: "action",
      subType: "assign",
      attributes: {
        ...buildContext.attributes, // location, expr, etc.
      },
    };
  },
  async execute(ctx: ElementExecutionContext<AssignAttributes>) {
    const { location, expr } = ctx.attributes;

    if (!location) {
      throw new Error("Assign element requires a 'location' attribute");
    }

    // Create a function that evaluates the expression in the context of the datamodel
    const evaluateExpression = (expression: string) => {
      const fn = new Function(
        ...Object.keys(ctx.datamodel),
        `return ${expression}`
      );
      return fn(...Object.values(ctx.datamodel));
    };

    // If expr is provided, evaluate it and assign the result
    // Otherwise, use the text content as the value
    const value = expr ? evaluateExpression(expr) : ctx.input;

    // Get the current state ID for scope validation
    const currentStateId = ctx.state.id;

    // Check if the variable is readonly and validate scope/type
    if (!(ctx as any).updateVariable) {
      // Fallback if updateVariable is not available
      // Check if the variable is readonly
      const isReadonly =
        ctx.datamodel.__metadata?.[location]?.readonly === true;

      if (isReadonly) {
        return new StepValue({
          type: "error",
          code: "ASSIGN_ERROR",
          error: `Cannot assign to readonly variable: ${location}`,
        });
      }

      // Update the datamodel at the specified location
      ctx.datamodel[location] = value;
    } else {
      // Use the enhanced updateVariable method if available
      const updated = (ctx as any).updateVariable(
        location,
        value,
        currentStateId
      );

      if (!updated) {
        return new StepValue({
          type: "error",
          code: "ASSIGN_ERROR",
          error: `Failed to assign value to ${location}. Check console for details.`,
        });
      }
    }

    return new StepValue({
      type: "object",
      object: { location, value },
    });
  },
});
```

### 5. Enhance Parser with Assign Element Validation

The parser needs to be enhanced to provide diagnostic errors for assign elements with type mismatches or scope violations. This will involve adding a validation phase to the parser pipeline that checks assign elements against the datamodel.

```typescript
// packages/parser/src/parser/validate-assign.ts
import { visit } from "unist-util-visit";
import { Root } from "mdast";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver-types";

// Interface for variable metadata
interface VariableMetadata {
  type: string;
  readonly: boolean;
  parentStateId: string | null;
}

// Interface for datamodel
interface Datamodel {
  [key: string]: {
    metadata: VariableMetadata;
  };
}

// Function to validate assign elements
export function validateAssignElements(
  ast: Root,
  datamodel: Datamodel
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Visit all assign elements in the AST
  visit(ast, (node) => {
    if (node.type === "mdxJsxFlowElement" && node.name === "assign") {
      // Extract location and value from assign element
      const locationAttr = node.attributes.find(
        (attr) => attr.name === "location"
      );
      const exprAttr = node.attributes.find((attr) => attr.name === "expr");

      if (!locationAttr) {
        // Missing location attribute
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: {
              line: node.position.start.line - 1,
              character: node.position.start.column - 1,
            },
            end: {
              line: node.position.end.line - 1,
              character: node.position.end.column - 1,
            },
          },
          message: "Assign element requires a location attribute",
          source: "AIML",
        });
        return;
      }

      const location = locationAttr.value as string;

      // Check if variable exists in datamodel
      if (!datamodel[location]) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: {
              line: locationAttr.position.start.line - 1,
              character: locationAttr.position.start.column - 1,
            },
            end: {
              line: locationAttr.position.end.line - 1,
              character: locationAttr.position.end.column - 1,
            },
          },
          message: `Variable '${location}' does not exist in datamodel`,
          source: "AIML",
        });
        return;
      }

      // Check if variable is readonly
      if (datamodel[location].metadata.readonly) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: {
              line: locationAttr.position.start.line - 1,
              character: locationAttr.position.start.column - 1,
            },
            end: {
              line: locationAttr.position.end.line - 1,
              character: locationAttr.position.end.column - 1,
            },
          },
          message: `Cannot assign to readonly variable '${location}'`,
          source: "AIML",
        });
      }

      // Check if variable is in scope
      const currentStateId = getCurrentStateId(node);
      if (!isInScope(location, currentStateId, datamodel)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: {
              line: locationAttr.position.start.line - 1,
              character: locationAttr.position.start.column - 1,
            },
            end: {
              line: locationAttr.position.end.line - 1,
              character: locationAttr.position.end.column - 1,
            },
          },
          message: `Variable '${location}' is not accessible from current scope`,
          source: "AIML",
        });
      }

      // Check type compatibility if expr is provided
      if (exprAttr) {
        const expr = exprAttr.value as string;
        const expectedType = datamodel[location].metadata.type;

        // This is a simplified type check - in a real implementation, we would need to evaluate the expression
        // and check its type against the expected type
        if (!isTypeCompatible(expr, expectedType)) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: {
                line: exprAttr.position.start.line - 1,
                character: exprAttr.position.start.column - 1,
              },
              end: {
                line: exprAttr.position.end.line - 1,
                character: exprAttr.position.end.column - 1,
              },
            },
            message: `Type mismatch: cannot assign to '${location}' of type '${expectedType}'`,
            source: "AIML",
          });
        }
      }
    }
  });

  return diagnostics;
}

// Helper function to get the current state ID
function getCurrentStateId(node: any): string {
  // In a real implementation, we would traverse up the AST to find the parent state
  // This is a placeholder
  return "currentState";
}

// Helper function to check if a variable is in scope
function isInScope(
  variableId: string,
  currentStateId: string,
  datamodel: Datamodel
): boolean {
  const metadata = datamodel[variableId].metadata;
  const variableParentStateId = metadata.parentStateId;

  // If no parent state ID (root level datamodel), it's globally accessible
  if (!variableParentStateId) {
    return true;
  }

  // Check if the current state is the same as or a descendant of the variable's parent state
  // In a real implementation, we would need to traverse the state hierarchy
  // This is a placeholder
  return currentStateId === variableParentStateId;
}

// Helper function to check type compatibility
function isTypeCompatible(expr: string, expectedType: string): boolean {
  // In a real implementation, we would need to evaluate the expression and check its type
  // This is a placeholder
  return true;
}
```

### 6. Update Parser Pipeline

```typescript
// packages/parser/src/parser/transform-nodes.ts
import { validateAssignElements } from "./validate-assign";

// Add to the main transformation pipeline
export async function processDocument(text: string) {
  const ast = await parseMDX(text);
  const transformed = transformAST(ast);

  // Build datamodel from data elements
  const datamodel = buildDatamodel(transformed);

  // Validate assign elements
  const diagnostics = validateAssignElements(transformed, datamodel);

  // Add diagnostics to the result
  const result = finalizeAST(transformed);
  result.diagnostics = diagnostics;

  return result;
}

// Helper function to build datamodel from data elements
function buildDatamodel(ast: Root): Datamodel {
  const datamodel: Datamodel = {};

  // Visit all data elements in the AST
  visit(ast, (node) => {
    if (node.type === "mdxJsxFlowElement" && node.name === "data") {
      const idAttr = node.attributes.find((attr) => attr.name === "id");
      const typeAttr = node.attributes.find((attr) => attr.name === "type");
      const readonlyAttr = node.attributes.find(
        (attr) => attr.name === "readonly"
      );
      const fromRequestAttr = node.attributes.find(
        (attr) => attr.name === "fromRequest"
      );

      if (idAttr) {
        const id = idAttr.value as string;
        const type = typeAttr ? (typeAttr.value as string) : "string";
        const readonly = readonlyAttr ? readonlyAttr.value === "true" : false;
        const fromRequest = fromRequestAttr
          ? fromRequestAttr.value === "true"
          : false;

        // If fromRequest is true, readonly should also be true
        const isReadonly = readonly || fromRequest;

        // Get parent state ID
        const parentStateId = getParentStateId(node);

        // Add to datamodel
        datamodel[id] = {
          metadata: {
            type,
            readonly: isReadonly,
            parentStateId,
          },
        };
      }
    }
  });

  return datamodel;
}

// Helper function to get parent state ID
function getParentStateId(node: any): string | null {
  // In a real implementation, we would traverse up the AST to find the parent state
  // This is a placeholder
  return null;
}
```

## Testing Strategy (TDD Approach)

Following the TDD approach, we'll write tests before implementing the actual functionality. Here's a comprehensive testing strategy:

### 1. DataElement Tests (`packages/elements/src/context/DataElement.test.ts`)

```typescript
import { DataElement } from "./DataElement";
import { ElementExecutionContext } from "../utils/ElementExecutionContext";
import { mockExecutionContext } from "../utils/mock-execution-context";

describe("DataElement", () => {
  // Test 1: Basic initialization with expr
  test("should initialize with expr attribute", async () => {
    const dataElement = new DataElement({
      id: "testData",
      attributes: {
        id: "testData",
        expr: "5 + 5",
      },
    });

    const ctx = mockExecutionContext();
    const result = await dataElement.execute(ctx, []);

    expect(await result.value()).toEqual({
      id: "testData",
      value: 10,
      metadata: expect.objectContaining({
        type: "string",
        readonly: false,
        id: "testData",
      }),
    });
    expect(ctx.datamodel.testData).toBe(10);
  });
```
