import { describe, expect, it, mock } from "bun:test";
import { Assign } from "./AssignElement";
import { StepValue } from "@fireworks/shared";
import { ValueType } from "@fireworks/types";
import type { ElementExecutionContext, ErrorResult } from "@fireworks/types";

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
  // Mock execution context with a simple datamodel
  const createMockContext = (
    overrides: {
      attributes?: Record<string, any>;
      datamodel?: Record<string, any>;
      [key: string]: any;
    } = {}
  ): ElementExecutionContext => {
    // Create a simple datamodel with initial values
    const datamodel = {
      testVar: "initial value",
      numberVar: 0,
      readonlyVar: "cannot change",
      __metadata: {
        testVar: {
          id: "testVar",
          type: ValueType.STRING,
          readonly: false,
          fromRequest: false,
          parentStateId: "state_1",
        },
        numberVar: {
          id: "numberVar",
          type: ValueType.NUMBER,
          readonly: false,
          fromRequest: false,
          parentStateId: "state_1",
        },
        readonlyVar: {
          id: "readonlyVar",
          type: ValueType.STRING,
          readonly: true,
          fromRequest: false,
          parentStateId: "state_1",
        },
      },
      ...overrides.datamodel,
    };

    return {
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
      datamodel,
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
  };

  // Test 1: Basic assignment with expr
  it("should assign a value using expr", async () => {
    const ctx = createMockContext();

    const assignElement = Assign.initFromAttributesAndNodes(ctx.attributes, []);
    const execResult = await assignElement.execute(ctx);
    const { result: stepValue } = execResult;
    const contextUpdate = (execResult as any).contextUpdate;

    // Verify the result directly
    const valueResult = await stepValue.value();
    if (!isObjectResult(valueResult)) {
      throw new Error("Expected object result");
    }
    expect(valueResult.type).toBe("object");
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
    const contextUpdate = (execResult as any).contextUpdate;

    // Verify the result directly
    const valueResult = await stepValue.value();
    if (!isObjectResult(valueResult)) {
      throw new Error("Expected object result");
    }
    expect(valueResult.type).toBe("object");
    expect(valueResult.object).toEqual({
      location: "testVar",
      value: inputValue,
    });
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
      attributes: {
        location: "numberVar",
        expr: "42", // Valid number
      },
    });

    const assignElement = Assign.initFromAttributesAndNodes(ctx.attributes, []);
    const execResult = await assignElement.execute(ctx);
    const { result: stepValue } = execResult;
    const contextUpdate = (execResult as any).contextUpdate;

    // Verify the result directly
    const valueResult = await stepValue.value();
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
});
