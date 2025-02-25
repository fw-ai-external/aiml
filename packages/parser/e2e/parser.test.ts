import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { MDXParser } from "../src";
import { BaseElement } from "../src/BaseElement";

// Helper function to read AIML files recursively from a directory
function getAllAimlFiles(dir: string): string[] {
  const files = readdirSync(dir, { withFileTypes: true });

  const result: string[] = [];

  for (const file of files) {
    const path = join(dir, file.name);

    if (file.isDirectory()) {
      result.push(...getAllAimlFiles(path));
    } else if (file.name.endsWith(".aiml")) {
      result.push(path);
    }
  }

  return result;
}

describe("AIML Example E2E Tests", () => {
  // Helper to get relative path for better test names
  function getRelativePath(absolutePath: string): string {
    const rootDir = process.cwd();
    // Go up one directory level from the parser package to the root
    const projectRoot = join(rootDir, "../..");
    return absolutePath.replace(projectRoot, "").replace(/^\//, "");
  }

  // Path to examples directory (at root level)
  const examplesDir = join(process.cwd(), "../..", "examples");

  // InvestmentAdvisor example tests
  describe("InvestmentAdvisor", () => {
    const exampleDir = join(examplesDir, "InvestmentAdvisor");
    const aimlFiles = getAllAimlFiles(exampleDir);

    test("should find AIML files in InvestmentAdvisor example", () => {
      expect(aimlFiles.length).toBeGreaterThan(0);
    });

    aimlFiles.forEach((filePath) => {
      test(`should parse ${getRelativePath(filePath)} without errors`, () => {
        const aimlContent = readFileSync(filePath, "utf-8");
        const parser = new MDXParser(aimlContent);
        const result = parser.parse(aimlContent);

        expect(result.errors).toHaveLength(0);
        expect(result.ast).toBeInstanceOf(BaseElement);
      });
    });

    test("should parse main InvestmentAdvisor workflow correctly", () => {
      const mainFile = join(exampleDir, "index.aiml");
      const aimlContent = readFileSync(mainFile, "utf-8");
      const parser = new MDXParser(aimlContent);
      const result = parser.parse(aimlContent);

      // Verify workflow structure
      expect(result.ast.tag).toBe("workflow");
      expect(result.ast.children.length).toBeGreaterThan(0);

      // Verify datamodel exists
      const datamodel = result.ast.children.find(
        (child) => child.tag === "datamodel"
      );
      expect(datamodel).toBeDefined();

      // Verify imported components are included
      const stateComponents = result.ast.children.filter((child) =>
        [
          "ProfileAssessment",
          "MarketAnalysis",
          "AssetAllocation",
          "PortfolioRecommendation",
          "PresentRecommendation",
        ].includes(child.tag)
      );
      expect(stateComponents.length).toBe(5);
    });
  });

  // Create tests for all other example directories
  const exampleDirs = readdirSync(examplesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((name) => name !== "InvestmentAdvisor"); // Already handled above

  exampleDirs.forEach((exampleName) => {
    describe(exampleName, () => {
      const exampleDir = join(examplesDir, exampleName);
      const aimlFiles = getAllAimlFiles(exampleDir);

      test(`should find AIML files in ${exampleName} example`, () => {
        expect(aimlFiles.length).toBeGreaterThan(0);
      });

      aimlFiles.forEach((filePath) => {
        test(`should parse ${getRelativePath(filePath)} without errors`, () => {
          const aimlContent = readFileSync(filePath, "utf-8");
          const parser = new MDXParser(aimlContent);
          const result = parser.parse(aimlContent);

          expect(result.errors).toHaveLength(0);
          expect(result.ast).toBeInstanceOf(BaseElement);
        });
      });

      // Test the main workflow file if it exists
      const mainFile = join(exampleDir, "index.aiml");
      try {
        if (readFileSync(mainFile, "utf-8")) {
          test(`should correctly parse main ${exampleName} workflow`, () => {
            const aimlContent = readFileSync(mainFile, "utf-8");
            const parser = new MDXParser(aimlContent);
            const result = parser.parse(aimlContent);

            // Verify workflow structure
            expect(result.ast.tag).toBe("workflow");

            // Verify datamodel exists if it's part of the structure
            const datamodel = result.ast.children.find(
              (child) => child.tag === "datamodel"
            );
            if (datamodel) {
              expect(datamodel.children.length).toBeGreaterThan(0);
            }
          });
        }
      } catch (error) {
        // Main file might not exist, which is fine
      }
    });
  });
});
