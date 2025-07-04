import { describe, it, expect } from "bun:test";
// import { z } from "zod"; // Removed unused import
import { elementExpressionCallbackSchema, jsTemplateStringSchema } from "./zod";

describe("jsExpressionSchema", () => {
  it("should validate correct JavaScript expressions", () => {
    expect(elementExpressionCallbackSchema.safeParse("1 + 1").success).toBe(
      true
    );
    expect(elementExpressionCallbackSchema.safeParse("myVar").success).toBe(
      true
    );
    expect(elementExpressionCallbackSchema.safeParse("myFunc()").success).toBe(
      true
    );
    expect(elementExpressionCallbackSchema.safeParse("obj.prop").success).toBe(
      true
    );
    expect(elementExpressionCallbackSchema.safeParse("a === b").success).toBe(
      true
    );
    expect(
      elementExpressionCallbackSchema.safeParse("[1, 2, 3].map(x => x * 2)")
        .success
    ).toBe(true);
  });

  it("should invalidate incorrect JavaScript expressions", () => {
    const result1 = elementExpressionCallbackSchema.safeParse(
      "::FUNCTION-EXPRESSION::(context) => { const ctx = context; return 1 +}"
    );
    expect(result1.success).toBe(false);
    if (!result1.success) {
      expect(result1.error.errors[0].message).toContain("Unexpected token"); // Acorn error
    }

    const result2 = elementExpressionCallbackSchema.safeParse("let a =");
    expect(result2.success).toBe(false);
    if (!result2.success) {
      // Acorn error for incomplete let statement might vary, check for common part
      expect(result2.error.errors[0].message).toContain("Unexpected token");
    }

    const result3 = elementExpressionCallbackSchema.safeParse("if (");
    expect(result3.success).toBe(false);
    if (!result3.success) {
      expect(result3.error.errors[0].message).toContain("Unexpected token");
    }
  });

  it("should invalidate undefined for optional schema", () => {
    expect(elementExpressionCallbackSchema.safeParse(undefined).success).toBe(
      false
    );
  });

  // Note: Testing non-string input might be redundant if schema is used after z.string()
  // but testing null as it's a common edge case not caught by undefined check.
  it("should invalidate null", () => {
    expect(elementExpressionCallbackSchema.safeParse(null).success).toBe(false);
  });
});

describe("jsTemplateStringSchema", () => {
  it("should validate correct template strings", () => {
    expect(jsTemplateStringSchema.safeParse("hello").success).toBe(true);
    expect(jsTemplateStringSchema.safeParse("hello ${name}").success).toBe(
      true
    );
    expect(jsTemplateStringSchema.safeParse("value is ${1 + 1}").success).toBe(
      true
    );
    expect(jsTemplateStringSchema.safeParse("").success).toBe(true); // Empty template string
  });

  it("should validate undefined for optional schema", () => {
    expect(jsTemplateStringSchema.safeParse(undefined).success).toBe(true);
  });

  it("should invalidate null", () => {
    expect(jsTemplateStringSchema.safeParse(null).success).toBe(false);
  });
});
