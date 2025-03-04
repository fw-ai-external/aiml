import { describe, expect, test } from "bun:test";
import { CompilerConfig } from "../utils/compiler-config";

describe("CompilerConfig", () => {
  describe("getDefaultOptions", () => {
    test("should return correct compiler options", () => {
      const options = CompilerConfig.getDefaultOptions();

      expect(options.jsx).toBe(1);
      expect(options.allowJs).toBe(true);
      expect(options.allowJsx).toBe(true);
      expect(options.moduleResolution).toBe(2);
      expect(options.noImplicitAny).toBe(false);
      expect(options.skipLibCheck).toBe(true);
      expect(options.noResolve).toBe(true);
      expect(options.types).toEqual([]);
      expect(options.target).toBe(6);
      expect(options.module).toBe(99);
      expect(options.esModuleInterop).toBe(true);
      expect(options.resolveJsonModule).toBe(true);
      expect(options.noLib).toBe(true);
      expect(options.skipDefaultLibCheck).toBe(true);
    });
  });

  describe("getDiagnosticFilters", () => {
    test("should return array of diagnostic filters", () => {
      const filters = CompilerConfig.getDiagnosticFilters();

      expect(Array.isArray(filters)).toBe(true);
      expect(filters.length).toBeGreaterThan(0);

      // Check for essential filters
      expect(filters).toContain("Cannot find name");
      expect(filters).toContain("JSX element implicitly has type 'any'");
      expect(filters).toContain("Cannot find module");
      expect(filters).toContain("Cannot find lib.dom.d.ts");
    });

    test("should include all necessary TypeScript lib filters", () => {
      const filters = CompilerConfig.getDiagnosticFilters();

      const libFilters = filters.filter((f) => f.includes("Cannot find lib"));
      expect(libFilters).toContain("Cannot find lib.dom.d.ts");
      expect(libFilters).toContain("Cannot find lib.es2020.d.ts");
      expect(libFilters).toContain("Cannot find lib.es5.d.ts");
      expect(libFilters).toContain("Cannot find lib.es6.d.ts");
    });
  });
});
