import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { MDXParser } from "../src";

// Path to examples directory (at root level)
const examplesDir = join(process.cwd(), "../..", "examples");

if (!existsSync(examplesDir)) {
  console.warn(
    "Skipping AIML Structure Validation tests because examples directory does not exist"
  );
  describe.skip("AIML Structure Validation", () => {});
} else {
  describe("AIML Structure Validation", () => {
    describe("InvestmentAdvisor Structure", () => {
      test("index.aiml should have expected structure", () => {
        const filePath = join(examplesDir, "InvestmentAdvisor", "index.aiml");
        if (!existsSync(filePath)) {
          console.warn(`Skipping test because file ${filePath} does not exist`);
          return;
        }
        const content = readFileSync(filePath, "utf-8");
        const parser = new MDXParser(content);
        const result = parser.parse(content);

        // Validate workflow element
        expect(result.ast.tag).toBe("workflow");
        expect(result.ast.attributes.initial).toBe("profileAssessment");

        // Validate datamodel exists
        const datamodel = result.ast.children.find(
          (child) => child.tag === "datamodel"
        );
        expect(datamodel).toBeDefined();

        // Validate datamodel has data children
        if (datamodel) {
          const dataElements = datamodel.children.filter(
            (child) => child.tag === "data"
          );
          expect(dataElements.length).toBeGreaterThan(0);

          // Check for specific data elements
          const dataIds = dataElements.map((data) => data.attributes.id);
          expect(dataIds).toContain("investmentGoal");
          expect(dataIds).toContain("riskTolerance");
          expect(dataIds).toContain("timeHorizon");
          expect(dataIds).toContain("initialInvestment");
          expect(dataIds).toContain("profile");
          expect(dataIds).toContain("assetAllocation");
          expect(dataIds).toContain("portfolioRecommendation");
          expect(dataIds).toContain("marketAnalysis");
        }

        // Validate imported components are used
        const componentTags = result.ast.children
          .filter((child) => child.tag !== "datamodel")
          .map((child) => child.tag);

        expect(componentTags).toContain("ProfileAssessment");
        expect(componentTags).toContain("MarketAnalysis");
        expect(componentTags).toContain("AssetAllocation");
        expect(componentTags).toContain("PortfolioRecommendation");
        expect(componentTags).toContain("PresentRecommendation");
      });
    });

    // Tests for specific state files
    describe("InvestmentAdvisor State Components", () => {
      test("ProfileAssessment.aiml should have correct structure", () => {
        const filePath = join(
          examplesDir,
          "InvestmentAdvisor",
          "states",
          "ProfileAssessment.aiml"
        );
        if (!existsSync(filePath)) {
          console.warn(`Skipping test because file ${filePath} does not exist`);
          return;
        }
        const content = readFileSync(filePath, "utf-8");
        const parser = new MDXParser(content);
        const result = parser.parse(content);

        expect(result.ast.tag).toBe("State");
        expect(result.ast.attributes.id).toBe("profileAssessment");
      });

      test("MarketAnalysis.aiml should have correct structure", () => {
        const filePath = join(
          examplesDir,
          "InvestmentAdvisor",
          "states",
          "MarketAnalysis.aiml"
        );
        if (!existsSync(filePath)) {
          console.warn(`Skipping test because file ${filePath} does not exist`);
          return;
        }
        const content = readFileSync(filePath, "utf-8");
        const parser = new MDXParser(content);
        const result = parser.parse(content);

        expect(result.ast.tag).toBe("State");
        expect(result.ast.attributes.id).toBe("marketAnalysis");
      });

      test("AssetAllocation.aiml should have correct structure", () => {
        const filePath = join(
          examplesDir,
          "InvestmentAdvisor",
          "states",
          "AssetAllocation.aiml"
        );
        if (!existsSync(filePath)) {
          console.warn(`Skipping test because file ${filePath} does not exist`);
          return;
        }
        const content = readFileSync(filePath, "utf-8");
        const parser = new MDXParser(content);
        const result = parser.parse(content);

        expect(result.ast.tag).toBe("State");
        expect(result.ast.attributes.id).toBe("assetAllocation");
      });
    });

    // Add similar structure tests for other examples as needed
  });
}
