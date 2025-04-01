import { safeParse } from "../src/safeParse";
import { DiagnosticSeverity } from "@fireworks/shared";
import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("Fixed AIML Parser - Drive-Thru Example", () => {
  it("should parse the fixed drive-thru AIML without fatal errors", () => {
    try {
      const fixedAiml = readFileSync(
        join(__dirname, "fixed-drive-thru.mdx"),
        "utf8"
      );

      const { ast, diagnostics } = safeParse(fixedAiml, {
        filePath: "fixed-drive-thru.mdx",
        generateIds: true,
      });

      // Check that AST is generated
      expect(ast).toBeDefined();
      expect(ast.type).toBe("root");

      // Log diagnostics for debugging
      console.log("Fixed AIML Diagnostics:", Array.from(diagnostics));

      // Since we expect AIML007 errors which are by design, we only check
      // that the errors are of the expected type
      const errors = Array.from(diagnostics).filter(
        (d) => d.severity === DiagnosticSeverity.Error
      );

      // Check for specific error codes we want to handle specially
      const nonXmlSyntaxErrors = errors.filter(
        (d) => !["AIML007", "ATTR001"].includes(d.code)
      );
      expect(nonXmlSyntaxErrors.length).toBe(0);
    } catch (error) {
      console.error("Failed to read fixed AIML file:", error);
      throw error;
    }
  });
});
