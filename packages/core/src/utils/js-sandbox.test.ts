import { describe, expect, it } from "vitest";
import { SandboxEvalError } from "../errors/SandboxEvalError";
import type { StepContextSerialized } from "../runtime/StepContext";
import { sandboxedEval } from "./js-sandbox";

// Helper function to create a base context with required properties
function createBaseContext(
  overrides: Record<string, any> = {}
): StepContextSerialized {
  return {
    input: null,
    inputs: null,
    chatHistory: [],
    userInput: "",
    context: {},
    props: {},
    step: { id: "rs_test-step", name: "test", type: "test" },
    output: null,
    _event: { name: "test", data: {} },
    _sessionid: "test-session",
    _name: "test",
    _ioprocessors: {},
    _x: {},
    ...overrides,
  };
}

describe("sandboxedEval", () => {
  // Test basic expression evaluation
  it("should evaluate basic expressions", () => {
    const result = sandboxedEval("1 + 1", createBaseContext());
    expect(result).toBe(2);
  });

  // Test with custom sandbox variables
  it("should access sandbox variables correctly", () => {
    const context = createBaseContext({
      x: 10,
      y: 20,
    });
    const result = sandboxedEval("x + y", context);
    expect(result).toBe(30);
  });

  // Test nested object access
  it("should handle nested object access", () => {
    const context = createBaseContext({
      "data.value": 42,
      data: { nested: { value: 100 } },
    });
    const result = sandboxedEval("data.nested.value", context);
    expect(result).toBe(100);
  });

  // Test with codeInReturn option
  it("should respect codeInReturn option", () => {
    const context = createBaseContext({ x: 5 });
    const result = sandboxedEval("let y = x * 2; y += 1; return y;", context, {
      codeInReturn: false,
    });
    expect(result).toBe(11);
  });

  // Test error handling for invalid code
  it("should throw SandboxEvalError for syntax errors", () => {
    expect(() => {
      sandboxedEval("invalid syntax }", createBaseContext());
    }).toThrow(SandboxEvalError);
  });

  // Test undefined handling
  it("should handle undefined values in context", () => {
    const context = createBaseContext({
      definedValue: 42,
      undefinedValue: undefined,
    });
    const result = sandboxedEval("definedValue", context);
    expect(result).toBe(42);
  });

  // Test built-in constants
  it("should handle RunStepContext built-in keys correctly", () => {
    const context = createBaseContext({
      _event: { name: "test", data: {} },
      customVar: "value",
    });
    const result = sandboxedEval("_event.name + customVar", context);
    expect(result).toBe("testvalue");
  });

  // Test array operations
  it("should handle array operations", () => {
    const context = createBaseContext({
      arr: [1, 2, 3],
    });
    const result = sandboxedEval("arr.map(x => x * 2)", context);
    expect(result).toEqual([2, 4, 6]);
  });

  // Test multiple statements
  it("should execute multiple statements with codeInReturn false", () => {
    const context = createBaseContext({ initial: 5 });
    const code = `
      let result = initial;
      result *= 2;
      result += 1;
      return result;
    `;
    const result = sandboxedEval(code, context, { codeInReturn: false });
    expect(result).toBe(11);
  });

  // Test error for accessing forbidden globals
  it("should prevent access to forbidden globals", () => {
    expect(() => {
      sandboxedEval("process.env", createBaseContext());
    }).toThrow();
  });

  // Test string operations
  it("should handle string operations", () => {
    const context = createBaseContext({
      firstName: "John",
      lastName: "Doe",
    });
    const result = sandboxedEval(
      "firstName.toUpperCase() + ' ' + lastName",
      context
    );
    expect(result).toBe("JOHN Doe");
  });

  // Test mathematical operations
  it("should handle complex mathematical operations", () => {
    const context = createBaseContext({
      a: 10,
      b: 5,
      c: 2,
    });
    const result = sandboxedEval("Math.pow(a, 2) + b * c", context);
    expect(result).toBe(110); // 100 + 10
  });
});
