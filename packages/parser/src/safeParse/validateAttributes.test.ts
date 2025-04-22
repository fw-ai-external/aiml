import { describe, expect, test } from "bun:test";
import { validateAttributes } from "./validateAttributes";
import { DiagnosticSeverity, type Diagnostic } from "@aiml/shared";

describe("validateAttributes", () => {
  test("validates assign element with required location attribute", () => {
    const attributes = {
      location: "user.name",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      { name: "assign" },
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(0);
  });

  describe("script element validation", () => {
    test("validates script with valid JavaScript code", () => {
      const node = {
        name: "script",
        start: { line: 1, column: 1 },
        end: { line: 1, column: 10 },
      };
      const attributes = {
        content: "const x = 1; console.log(x);",
        language: "javascript",
      };

      const diagnostics = new Set<Diagnostic>();
      const diagnosticsResult = validateAttributes(
        node,
        attributes,
        diagnostics
      );

      expect(diagnosticsResult.size).toBe(0);
    });

    test("fails validation for invalid JavaScript syntax", () => {
      const node = {
        name: "script",
        start: { line: 1, column: 1 },
        end: { line: 1, column: 10 },
        children: [
          {
            type: "text",
            value: "const x = ;",
            position: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 10 },
            },
          },
        ],
      };
      const attributes = {
        content: "const x = ;",
        language: "javascript",
      };

      const diagnostics = new Set<Diagnostic>();
      const diagnosticsResult = validateAttributes(
        node,
        attributes,
        diagnostics
      );

      expect(diagnosticsResult.size).toBe(1);
      const diagnosticsArray = Array.from(diagnostics);
      expect(diagnosticsArray[0]).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("JavaScript syntax error"),
          severity: DiagnosticSeverity.Error,
          code: "SCRIPT001",
          source: "AIML",
        })
      );
    });

    test("fails validation for missing code content", () => {
      const node = {
        name: "script",
        start: { line: 1, column: 1 },
        end: { line: 1, column: 10 },
      };
      const attributes = {
        language: "javascript",
      };

      const diagnostics = new Set<Diagnostic>();
      const diagnosticsResult = validateAttributes(
        node,
        attributes,
        diagnostics
      );

      expect(diagnosticsResult.size).toBe(1);
      const diagnosticsArray = Array.from(diagnostics);
      expect(diagnosticsArray[0]).toEqual(
        expect.objectContaining({
          message: "Script elements must contain code as a child/children",
          severity: DiagnosticSeverity.Error,
          code: "ATTR001",
          source: "AIML",
        })
      );
    });

    test("skips validation for non-JavaScript language", () => {
      const node = {
        name: "script",
        start: { line: 1, column: 1 },
        end: { line: 1, column: 10 },
      };
      const attributes = {
        content: "print('Hello')",
        language: "python",
      };

      const diagnostics = new Set<Diagnostic>();
      const diagnosticsResult = validateAttributes(
        node,
        attributes,
        diagnostics
      );

      expect(diagnosticsResult.size).toBe(0);
    });

    test("validates script with valid Python code", () => {
      const node = {
        name: "script",
        start: { line: 1, column: 1 },
        end: { line: 1, column: 10 },
      };
      const attributes = {
        content: "def greet(name):\n  print(f'Hello, {name}!')",
        language: "python",
      };

      const diagnostics = new Set<Diagnostic>();
      const diagnosticsResult = validateAttributes(
        node,
        attributes,
        diagnostics
      );

      expect(diagnosticsResult.size).toBe(0);
    });

    test("fails validation for invalid Python syntax", () => {
      const node = {
        name: "script",
        start: { line: 1, column: 1 },
        end: { line: 1, column: 10 },
      };
      const attributes = {
        content: "def greet(name)\n  print(f'Hello, {name}!')", // Missing colon
        language: "python",
      };

      const diagnostics = new Set<Diagnostic>();
      const diagnosticsResult = validateAttributes(
        node,
        attributes,
        diagnostics
      );

      expect(diagnosticsResult.size).toBe(0);
    });
  });

  test("fails validation for assign element without required location attribute", () => {
    const attributes = {
      wrongAttr: "test",
    };
    const node = {
      name: "assign",
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(node, attributes, diagnostics);

    expect(diagnosticsResult.size).toBe(1);
    const diagnosticsArray = Array.from(diagnostics);
    expect(diagnosticsArray).toHaveLength(1);
    expect(diagnosticsArray[0]).toEqual(
      expect.objectContaining({
        message:
          'Invalid props for element <assign>: Validation error: Required at "location"',
        severity: DiagnosticSeverity.Error,
        code: "ATTR001",
        source: "AIML",
        range: {
          start: { line: 1, column: 1 },
          end: { line: 2, column: 2 },
        },
      })
    );
  });

  test.skip("handles expression attributes correctly", () => {
    const attributes = {
      location: "user.name",
      expr: "${1 + 1}",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      { name: "assign" },
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
      { name: "llm" },
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(0);
  });

  test("fails validation for llm element without required model attribute", () => {
    const attributes = {
      instructions: "Some instructions",
    };
    const node = {
      name: "llm",
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(node, attributes, diagnostics);

    expect(diagnosticsResult.size).toBe(1);
    const diagnosticsArray = Array.from(diagnostics);
    expect(diagnosticsArray).toHaveLength(1);
    expect(diagnosticsArray[0]).toEqual(
      expect.objectContaining({
        message:
          'Invalid props for element <llm>: Validation error: Required at "model"',
        severity: DiagnosticSeverity.Error,
        code: "ATTR001",
        source: "AIML",
        range: {
          start: { line: 1, column: 1 },
          end: { line: 2, column: 2 },
        },
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
      { name: "transition" },
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
      { name: "data" },
      attributes,
      diagnostics
    );

    expect(diagnosticsResult.size).toBe(0);
  });

  test("fails validation for data element without required id attribute", () => {
    const attributes = {
      type: "string",
    };
    const node = {
      name: "data",
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(node, attributes, diagnostics);

    expect(diagnosticsResult.size).toBe(1);
    const diagnosticsArray = Array.from(diagnostics);
    expect(diagnosticsArray).toHaveLength(1);
    expect(diagnosticsArray[0]).toEqual(
      expect.objectContaining({
        message:
          'Invalid props for element <data>: Validation error: Required at "id"',
        severity: DiagnosticSeverity.Error,
        code: "ATTR001",
        source: "AIML",
        range: {
          start: { line: 1, column: 1 },
          end: { line: 2, column: 2 },
        },
      })
    );
  });

  test("validates unknown element attributes without error", () => {
    const attributes = {
      customAttr: "value",
    };

    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      { name: "unknownElement" },
      attributes,
      diagnostics
    );
    expect(diagnosticsResult.size).toBe(0);
  });

  // Add a test for an unknown element, which should pass without validation
  test("allows unknown elements through without validation", () => {
    const attributes = { anyAttribute: "anyValue" };
    const diagnostics = new Set<Diagnostic>();
    const diagnosticsResult = validateAttributes(
      { name: "unknownElement" },
      attributes,
      diagnostics
    );
    expect(diagnosticsResult.size).toBe(0);
  });
});
