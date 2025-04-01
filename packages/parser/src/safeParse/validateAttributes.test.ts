import { describe, expect, test } from "bun:test";
import { validateAttributes } from "./validateAttributes";
import { DiagnosticSeverity, type Diagnostic } from "@fireworks/shared";

describe("validateAttributes", () => {
  test("validates assign element with required location attribute", () => {
    const attributes = {
      location: "user.name",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      "assign",
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(0);
  });

  test("fails validation for assign element without required location attribute", () => {
    const attributes = {
      wrongAttr: "test",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      "assign",
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(1);
    const diagnosticsArray = Array.from(diagnostics);
    expect(diagnosticsArray).toHaveLength(1);
    expect(diagnosticsArray[0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          "Required attribute 'location' is missing"
        ),
        severity: DiagnosticSeverity.Error,
        code: "ATTR001",
      })
    );
  });

  test("handles expression attributes correctly", () => {
    const attributes = {
      location: "user.name",
      expr: "${1 + 1}",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      "assign",
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(0);
  });

  test("validates llm element with required model attribute", () => {
    const attributes = {
      model: "accounts/fireworks/models/llama-v3-7b",
      instructions: "Some instructions",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      "llm",
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(0);
  });

  test("fails validation for llm element without required model attribute", () => {
    const attributes = {
      instructions: "Some instructions",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      "llm",
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(1);
    const diagnosticsArray = Array.from(diagnostics);
    expect(diagnosticsArray).toHaveLength(1);
    expect(diagnosticsArray[0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          "Required attribute 'model' is missing"
        ),
        severity: DiagnosticSeverity.Error,
        code: "ATTR001",
      })
    );
  });

  test("validates transition element with optional attributes", () => {
    const attributes = {
      target: "someState",
      cond: "${x > 0}",
      type: "external",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      "transition",
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(0);
  });

  test("validates data element with required id attribute", () => {
    const attributes = {
      id: "myData",
      type: "string",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      "data",
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(0);
  });

  test("fails validation for data element without required id attribute", () => {
    const attributes = {
      type: "string",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      "data",
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(1);
    const diagnosticsArray = Array.from(diagnostics);
    expect(diagnosticsArray).toHaveLength(1);
    expect(diagnosticsArray[0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining("Required attribute 'id' is missing"),
        severity: DiagnosticSeverity.Error,
        code: "ATTR001",
      })
    );
  });

  test("validates unknown element attributes without error", () => {
    const attributes = {
      customAttr: "value",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      "unknownElement",
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(0);
  });
});
