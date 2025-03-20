import { describe, expect, it, mock } from "bun:test";
import { Assign } from "./AssignElement";
import { StepValue } from "@fireworks/shared";
import { createScopedDataModel } from "../context/ScopedDataModel";
import { ValueType } from "@fireworks/types";
import type { ElementExecutionContext, ErrorResult } from "@fireworks/types";

// Define the test execution context
interface TestElementExecutionContext extends ElementExecutionContext {
  workflowInput: {
    userMessage: string;
    systemMessage?: string;
    chatHistory: Array<any>;
    clientSideTools: any[];
  };
  machine: {
    id: string;
    secrets: Record<string, any>;
  };
  run: {
    id: string;
  };
  serialize(): Promise<any>;
  scopedDataModel: ReturnType<typeof createScopedDataModel>;
}

// Type guard for object result
function isObjectResult(
  result: any
): result is { type: "object"; object: Record<string, any> } {
  return (
    result &&
    typeof result === "object" &&
    result.type === "object" &&
    "object" in result
  );
}

// Type guard for error result
function isErrorResult(result: any): result is ErrorResult {
  return (
    result &&
    typeof result === "object" &&
    result.type === "error" &&
    "error" in result &&
    "code" in result
  );
}

describe("AssignElement", () => {
  // Mock execution context with DataModel setup
  const createMockContext = (
    overrides: {
      attributes?: Record<string, any>;
      variables?: Record<string, any>;
      metadata?: Record<string, any>;
      [key: string]: any;
    } = {}
  ): TestElementExecutionContext => {
    const defaultVariables = {
      testVar: "initial value",
      ...overrides.variables,
    };

    const defaultMetadata = {
      testVar: {
        id: "testVar",
        type: ValueType.STRING,
        readonly: false,
        fromRequest: false,
        parentStateId: "state_1",
      },
      ...overrides.metadata,
    };

    // Create a real scoped data model with initial state
    const scopedModel = createScopedDataModel(
      "state_1",
      defaultVariables,
      defaultMetadata
    );

    // Create a datamodel proxy that will be used in the context
    const datamodelProxy = new Proxy(
      {},
      {
        get(target, prop) {
          const key = String(prop);
          if (key === "__metadata") {
            return scopedModel.getAllMetadata();
          }
          return scopedModel.get(key);
        },
        set(target, prop, value) {
          const key = String(prop);
          if (key === "__metadata") {
            return false;
          }

          // Check if the variable is readonly before setting
          const metadata = scopedModel.getMetadata(key);
          if (metadata?.readonly) {
            throw new Error(`Cannot assign to readonly variable: ${key}`);
          }

          return scopedModel.set(key, value, true);
        },
        has(target, prop) {
          return scopedModel.has(String(prop));
        },
      }
    );

    // Store the scoped model for test verification
    const _scopedModel = scopedModel;

    const context: TestElementExecutionContext = {
      context: {
        workflow: {
          id: "test-workflow",
          version: 1,
        },
      },
      suspend: mock(),
      runId: "test-run-123",
      attributes: {
        location: "testVar",
        expr: "'test value'",
        ...overrides.attributes,
      },
      datamodel: datamodelProxy,
      scopedDataModel: scopedModel,
      state: {
        id: "state_1",
        attributes: {},
        input: new StepValue({ type: "text", text: "" }),
      },
      input: new StepValue({ type: "text", text: "input value" }),
      workflowInput: {
        userMessage: "test message",
        chatHistory: [],
        clientSideTools: [],
      },
      machine: {
        id: "test-machine",
        secrets: {},
      },
      run: {
        id: "test-run",
      },
      serialize: async () => ({}),
      ...overrides,
    };

    // Add a getter for the scoped model for test verification
    Object.defineProperty(context, "_scopedModel", {
      get: () => _scopedModel,
      enumerable: false,
    });

    return context;
  };

  // Test 1: Basic assignment with expr
  it("should assign a value using expr", async () => {
    const ctx = createMockContext();

    const assignElement = Assign.initFromAttributesAndNodes(ctx.attributes, []);
    const execResult = await assignElement.execute(ctx);
    const { result: stepValue } = execResult;

    const valueResult = await stepValue.value();

    // Verify the result directly
    if (!isObjectResult(valueResult)) {
      throw new Error("Expected object result");
    }
    expect(valueResult.object).toEqual({
      location: "testVar",
      value: "test value",
    });
  });

  // Test 2: Assignment with input value when no expr
  it("should assign input value when no expr is provided", async () => {
    // Create a context with a specific input value
    const ctx = createMockContext({
      attributes: {
        location: "testVar",
      },
    });

    // Set a specific input value
    const inputValue = "input value";
    ctx.input = new StepValue({ type: "text", text: inputValue });

    // Execute the element
    const assignElement = Assign.initFromAttributesAndNodes(ctx.attributes, []);
    const execResult = await assignElement.execute(ctx);
    const { result: stepValue } = execResult;

    const valueResult = await stepValue.value();

    expect(valueResult.type).toBe("object");
    if (isObjectResult(valueResult)) {
      expect(valueResult.object).toEqual({
        location: "testVar",
        value: inputValue,
      });
    }
  });

  // Test 3: Error when location is missing
  it("should return error when location is missing", async () => {
    // For this test, we'll just check that the schema validation works
    // by trying to create an element without a location
    try {
      Assign.initFromAttributesAndNodes({ expr: "'test value'" }, []);
      throw new Error("Expected schema validation to fail");
    } catch (error) {
      expect(String(error)).toContain("location");
    }
  });

  // Test 4: Error when variable doesn't exist
  it("should return error when variable doesn't exist", async () => {
    const ctx = createMockContext({
      attributes: {
        location: "nonExistentVar",
        expr: "'test value'",
      },
    });

    const assignElement = Assign.initFromAttributesAndNodes(ctx.attributes, []);
    const { result: stepValue } = await assignElement.execute(ctx);
    const result = await stepValue.value();
    if (!isErrorResult(result) && !isObjectResult(result)) {
      throw new Error("Expected error or object result");
    }

    if (!isErrorResult(result)) {
      throw new Error("Expected error result");
    }
    expect(result.type).toBe("error");
    expect(result.code).toBe("ASSIGN_ERROR");
    expect(result.error).toContain("does not exist");
  });

  // Test 5: Error when assigning to readonly variable
  it("should return error when assigning to readonly variable", async () => {
    const ctx = createMockContext({
      variables: {
        readonlyVar: "cannot change",
      },
      metadata: {
        readonlyVar: {
          id: "readonlyVar",
          type: ValueType.STRING,
          readonly: true,
          fromRequest: false,
          parentStateId: "state_1",
        },
      },
      attributes: {
        location: "readonlyVar",
        expr: "'new value'",
      },
    });

    const assignElement = Assign.initFromAttributesAndNodes(ctx.attributes, []);
    const { result: stepValue } = await assignElement.execute(ctx);
    const result = await stepValue.value();
    if (!isErrorResult(result) && !isObjectResult(result)) {
      throw new Error("Expected error or object result");
    }

    if (!isErrorResult(result)) {
      throw new Error("Expected error result");
    }
    expect(result.type).toBe("error");
    expect(result.code).toBe("ASSIGN_ERROR");
    expect(result.error).toContain("readonly");
  });

  // Test 6: Type validation
  it("should validate types when assigning values", async () => {
    const ctx = createMockContext({
      variables: {
        numberVar: 0,
      },
      metadata: {
        numberVar: {
          id: "numberVar",
          type: ValueType.NUMBER,
          readonly: false,
          fromRequest: false,
          parentStateId: "state_1",
        },
      },
      attributes: {
        location: "numberVar",
        expr: "42", // Valid number
      },
    });

    const assignElement = Assign.initFromAttributesAndNodes(ctx.attributes, []);
    const execResult = await assignElement.execute(ctx);
    const { result: stepValue } = execResult;

    const valueResult = await stepValue.value();
    if (!isErrorResult(valueResult) && !isObjectResult(valueResult)) {
      throw new Error("Expected error or object result");
    }

    if (!isObjectResult(valueResult)) {
      throw new Error("Expected object result");
    }
    expect(valueResult.type).toBe("object");
    expect(valueResult.object).toEqual({
      location: "numberVar",
      value: 42,
    });
  });

  // Test 7: Type validation error
  it("should return error when type validation fails", async () => {
    const ctx = createMockContext({
      variables: {
        numberVar: 0,
      },
      metadata: {
        numberVar: {
          id: "numberVar",
          type: ValueType.NUMBER,
          readonly: false,
          fromRequest: false,
          parentStateId: "state_1",
        },
      },
      attributes: {
        location: "numberVar",
        expr: "'not a number'", // Invalid for number type
      },
    });

    const assignElement = Assign.initFromAttributesAndNodes(ctx.attributes, []);
    const { result: stepValue } = await assignElement.execute(ctx);
    const result = await stepValue.value();
    if (!isErrorResult(result) && !isObjectResult(result)) {
      throw new Error("Expected error or object result");
    }

    if (!isErrorResult(result)) {
      throw new Error("Expected error result");
    }
    expect(result.type).toBe("error");
    expect(result.code).toBe("ASSIGN_ERROR");
    expect(result.error).toContain("must be a number");
  });

  // Test 8: Scope validation
  it("should respect variable scope", async () => {
    // Create parent and child scopes
    const parentScope = createScopedDataModel(
      "parent",
      {
        parentVar: "parent value",
      },
      {
        parentVar: {
          id: "parentVar",
          type: ValueType.STRING,
          readonly: false,
          fromRequest: false,
          parentStateId: "parent",
        },
      }
    );

    const childScope = createScopedDataModel(
      "child",
      {
        childVar: "child value",
      },
      {
        childVar: {
          id: "childVar",
          type: ValueType.STRING,
          readonly: false,
          fromRequest: false,
          parentStateId: "child",
        },
      },
      parentScope
    );

    // Create a sibling scope that shouldn't access child variables
    const siblingScope = createScopedDataModel(
      "sibling",
      {
        siblingVar: "sibling value",
      },
      {
        siblingVar: {
          id: "siblingVar",
          type: ValueType.STRING,
          readonly: false,
          fromRequest: false,
          parentStateId: "sibling",
        },
      },
      parentScope
    );

    // Child should be able to access parent variables
    expect(childScope.get("parentVar")).toBe("parent value");

    // Sibling should not be able to access child variables
    expect(siblingScope.get("childVar")).toBeUndefined();

    // Parent should not be able to access child variables
    expect(parentScope.get("childVar")).toBeUndefined();
  });
});
