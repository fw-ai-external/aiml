import { describe, expect, it } from "bun:test";
import { sandboxedEval } from "./JS";
import { StepValue } from "../StepValue";
import { ElementExecutionContext } from "../ElementExecutionContext";
// Helper function to create a base context with required properties
function createBaseContext(overrides: Record<string, any> = {}) {
  return new ElementExecutionContext({
    input: new StepValue({ type: "text", text: "" }),
    workflowInput: {
      chatHistory: [],
      userMessage: "",
      systemMessage: "",
      clientSideTools: [],
      secrets: {
        system: {},
        user: {},
      },
    },
    datamodel: {},
    attributes: {},
    state: {
      id: "rs_test-step",
      attributes: {},
      input: new StepValue({ type: "text", text: "" }),
    },
    run: { id: "test-run" },
    machine: { id: "test-machine", secrets: { system: {}, user: {} } },
    ...overrides,
  });
}

describe("sandboxedEval", () => {
  // Test basic expression evaluation
  it("should evaluate basic expressions", async () => {
    const result = await sandboxedEval("1 + 1", createBaseContext());
    expect(result).toBe(2);
  });

  // Test with custom sandbox variables
  it("should access sandbox variables correctly", async () => {
    const context = createBaseContext({
      x: 10,
      y: 20,
    });
    const result = await sandboxedEval("x + y", context);
    expect(result).toBe(30);
  });

  // Test nested object access
  it("should handle nested object access", async () => {
    const context = createBaseContext({
      "data.value": 42,
      data: { nested: { value: 100 } },
    });
    const result = await sandboxedEval("data.nested.value", context);
    expect(result).toBe(100);
  });

  // Test with codeInReturn option
  it("should respect codeInReturn option", async () => {
    const context = createBaseContext({ x: 5 });
    const result = await sandboxedEval(
      "let y = x * 2; y += 1; return y;",
      context,
      {
        codeInReturn: false,
      }
    );
    expect(result).toBe(11);
  });

  // Test error handling for invalid code
  it("should throw SandboxEvalError for syntax errors", async () => {
    await expect(async () => {
      await sandboxedEval("invalid syntax }", createBaseContext());
    }).rejects.toThrow(Error);
  });

  // Test undefined handling
  it("should handle undefined values in context", async () => {
    const context = createBaseContext({
      definedValue: 42,
      undefinedValue: undefined,
    });
    const result = await sandboxedEval("definedValue", context);
    expect(result).toBe(42);
  });

  // Test built-in constants
  it("should handle RunStepContext built-in keys correctly", async () => {
    const context = createBaseContext({
      _event: { name: "test", data: {} },
      customVar: "value",
    });
    const result = await sandboxedEval("_event.name + customVar", context);
    expect(result).toBe("testvalue");
  });

  // Test array operations
  it("should handle array operations", async () => {
    const context = createBaseContext({
      arr: [1, 2, 3],
    });
    const result = await sandboxedEval("arr.map(x => x * 2)", context);
    expect(result).toEqual([2, 4, 6]);
  });

  // Test multiple statements
  it("should execute multiple statements with codeInReturn false", async () => {
    const context = createBaseContext({ initial: 5 });
    const code = `
      let result = initial;
      result *= 2;
      result += 1;
      return result;
    `;
    const result = await sandboxedEval(code, context, { codeInReturn: false });
    expect(result).toBe(11);
  });

  // Test error for accessing forbidden globals
  it("should prevent access to forbidden globals", async () => {
    await expect(async () => {
      await sandboxedEval("process.env", createBaseContext());
    }).rejects.toThrow();
  });

  // Test string operations
  it("should handle string operations", async () => {
    const context = createBaseContext({
      firstName: "John",
      lastName: "Doe",
    });
    const result = await sandboxedEval(
      "firstName.toUpperCase() + ' ' + lastName",
      context
    );
    expect(result).toBe("JOHN Doe");
  });

  // Test mathematical operations
  it("should handle complex mathematical operations", async () => {
    const context = createBaseContext({
      a: 10,
      b: 5,
      c: 2,
    });
    const result = await sandboxedEval("Math.pow(a, 2) + b * c", context);
    expect(result).toBe(110); // 100 + 10
  });
});
