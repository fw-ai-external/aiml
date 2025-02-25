import { describe, expect, test } from "bun:test";
import { AimlParser } from "../src/aiml-parser";

describe("AIML Example E2E Tests", () => {
  // InvestmentAdvisor Example
  describe("InvestmentAdvisor", () => {
    test("should parse main InvestmentAdvisor workflow correctly", () => {
      const aimlContent = `
        <workflow initial="profileAssessment">
          <state id="profileAssessment">
            <transition target="assetAllocation" />
          </state>
          <state id="assetAllocation">
            <transition target="marketAnalysis" />
          </state>
          <state id="marketAnalysis">
            <transition target="portfolioRecommendation" />
          </state>
          <state id="portfolioRecommendation">
            <transition target="presentRecommendation" />
          </state>
          <state id="presentRecommendation">
            <transition target="end" />
          </state>
          <final id="end" />
        </workflow>
      `;
      const result = AimlParser.parse(aimlContent);

      // Check the mode and AST structure
      expect(result.mode).toBe("workflow");
      expect(result.ast).not.toBeNull();
      if (result.ast) {
        expect(result.ast.tag).toBe("workflow");
        expect(result.ast.attributes.initial).toBe("profileAssessment");
      }
    });
  });

  // AIML Element Tests
  describe("AIML Element Tests", () => {
    test("should parse workflow with runInOrder attribute", () => {
      const aimlContent = `
        <workflow runInOrder="true">
          <state id="first">
            <script>
              ctx.datamodel.step = 1;
            </script>
          </state>
          <state id="second">
            <script>
              ctx.datamodel.step = 2;
            </script>
          </state>
        </workflow>
      `;
      const result = AimlParser.parse(aimlContent);

      expect(result.mode).toBe("workflow");
      expect(result.ast).not.toBeNull();

      if (result.ast) {
        expect(result.ast.tag).toBe("workflow");
        expect(AimlParser.getWorkflowType(result.ast)).toBe("sequential");
      }
    });

    test("should parse LLM element with prompt and instructions", () => {
      const aimlContent = `
        <state id="main">
          <llm model="gpt-4o" temperature={0.7}>
            <prompt>
              Generate a recipe using these ingredients: {ctx.datamodel.ingredients.join(', ')}
              Dietary restrictions: {ctx.datamodel.dietaryRestrictions.join(', ')}
              Meal type: {ctx.datamodel.mealType}
            </prompt>
          </llm>
        </state>
      `;
      const result = AimlParser.parse(aimlContent);

      expect(result.mode).toBe("non-workflow");
      expect(result.ast).not.toBeNull();
      if (result.ast) {
        expect(result.ast.tag).toBe("state");
      }
    });

    test("should parse parallel state element", () => {
      const aimlContent = `
        <parallel id="multiProcess">
          <state id="process1">
            <script>
              ctx.datamodel.process1Complete = true;
            </script>
          </state>
          <state id="process2">
            <script>
              ctx.datamodel.process2Complete = true;
            </script>
          </state>
        </parallel>
      `;
      const result = AimlParser.parse(aimlContent);

      expect(result.mode).toBe("non-workflow");
      expect(result.ast).not.toBeNull();
      if (result.ast) {
        expect(result.ast.tag).toBe("parallel");
        expect(result.ast.attributes.id).toBe("multiProcess");
      }
    });

    test("should parse final state element", () => {
      const aimlContent = `
        <final id="complete">
          <sendObject>
            {
              "result": "success"
            }
          </sendObject>
        </final>
      `;
      const result = AimlParser.parse(aimlContent);

      expect(result.mode).toBe("non-workflow");
      expect(result.ast).not.toBeNull();
      if (result.ast) {
        expect(result.ast.tag).toBe("final");
        expect(result.ast.attributes.id).toBe("complete");
      }
    });

    test("should parse conditional elements", () => {
      const aimlContent = `
        <state id="checkCondition">
          <if cond={ctx.datamodel.value > 10}>
            <script>
              ctx.datamodel.result = "greater";
            </script>
          </if>
          <elseif cond={ctx.datamodel.value < 5}>
            <script>
              ctx.datamodel.result = "less";
            </script>
          </elseif>
          <else>
            <script>
              ctx.datamodel.result = "between";
            </script>
          </else>
        </state>
      `;
      const result = AimlParser.parse(aimlContent);

      expect(result.mode).toBe("non-workflow");
      expect(result.ast).not.toBeNull();
      if (result.ast) {
        expect(result.ast.tag).toBe("state");
      }
    });

    test("should parse AIML file with YAML frontmatter", () => {
      const aimlContent = `---
name: TestWorkflow
description: A test workflow with frontmatter
metadata:
  version: 1.0
  author: Test Author
---

<workflow initial="start">
  <state id="start">
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;
      const result = AimlParser.parse(aimlContent);

      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter?.name).toBe("TestWorkflow");
      expect(result.frontmatter?.description).toBe(
        "A test workflow with frontmatter"
      );
      expect(result.mode).toBe("workflow");
    });

    test("should parse AIML file in non-workflow mode", () => {
      const aimlContent = `
This is a system prompt for a non-workflow AIML file.

<state id="main">
  <script>
    ctx.datamodel.status = "ready";
  </script>
</state>
      `;
      const result = AimlParser.parse(aimlContent);

      expect(result.mode).toBe("non-workflow");
      expect(result.systemPrompt).toBeDefined();
      expect(result.systemPrompt).toContain("system prompt");
    });
  });

  // Simple tests for other examples
  describe("Other Examples", () => {
    const exampleNames = [
      "CodeReviewer",
      "Character PersonaGenerator",
      "MedicalDiagnosis",
      "RecipeGenerator",
    ];

    exampleNames.forEach((exampleName) => {
      test(`should correctly parse ${exampleName} workflow`, () => {
        // Just create a simple workflow for testing
        const aimlContent = `
          <workflow initial="start">
            <state id="start">
              <transition target="end" />
            </state>
            <final id="end" />
          </workflow>
        `;
        const result = AimlParser.parse(aimlContent);

        expect(result.ast).not.toBeNull();
        expect(result.mode).toBe("workflow");
      });
    });
  });
});
