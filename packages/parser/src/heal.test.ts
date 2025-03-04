import { describe, it, expect } from "bun:test";
import { parseMDXFilesToAIML, parseMDXToAIML } from ".";
import { astToRunnableBaseElementTree } from "./heal";
import { VFile } from "vfile";
import { readFileSync } from "fs";
import { join } from "path";
import { IBaseElement } from "@fireworks/types";

// Helper function to recursively check if all nodes are of type "element"
function checkAllNodesAreElements(element: IBaseElement): boolean {
  if (element.type !== "element") {
    console.error("Found non-element node:", element);
    return false;
  }

  // Check all children recursively
  for (const child of element.children) {
    if (child.type !== "element") {
      console.error("Found non-element child:", child);
      return false;
    }

    // If the child is an element, check its children recursively
    if (child.type === "element") {
      if (!checkAllNodesAreElements(child as IBaseElement)) {
        return false;
      }
    }
  }

  return true;
}

describe("Healing parsed results", () => {
  it("should heal the parsed results", async () => {
    const input = `
    ---
    name: TestWorkflow
    ---

    Hi there!
    `;

    const result = await parseMDXToAIML(input);
    const healed = astToRunnableBaseElementTree(result.nodes);

    expect(healed).toBeDefined();
    expect(healed.type).toBe("element");
  });

  // Test SimpleChain example
  it("should convert SimpleChain example to a valid element tree", async () => {
    const filePath = join(
      process.cwd(),
      "..",
      "..",
      "examples",
      "SimpleChain",
      "index.aiml"
    );
    const content = readFileSync(filePath, "utf-8");
    const file = new VFile({ path: filePath, value: content });

    const result = await parseMDXFilesToAIML([file]);
    const healed = astToRunnableBaseElementTree(result.nodes);

    expect(healed).toBeDefined();
    expect(healed.type).toBe("element");
    expect(checkAllNodesAreElements(healed)).toBe(true);
  });

  // Test SimpleRouter example
  it("should convert SimpleRouter example to a valid element tree", async () => {
    const filePath = join(
      process.cwd(),
      "..",
      "..",
      "examples",
      "SimpleRouter",
      "index.aiml"
    );
    const content = readFileSync(filePath, "utf-8");
    const file = new VFile({ path: filePath, value: content });

    const result = await parseMDXFilesToAIML([file]);
    const healed = astToRunnableBaseElementTree(result.nodes);

    expect(healed).toBeDefined();
    expect(healed.type).toBe("element");
    expect(checkAllNodesAreElements(healed)).toBe(true);
  });

  // Test JustPrompt example
  it("should convert JustPrompt example to a valid element tree", async () => {
    const filePath = join(
      process.cwd(),
      "..",
      "..",
      "examples",
      "JustPrompt",
      "index.aiml"
    );
    const content = readFileSync(filePath, "utf-8");
    const file = new VFile({ path: filePath, value: content });

    const result = await parseMDXFilesToAIML([file]);
    const healed = astToRunnableBaseElementTree(result.nodes);

    expect(healed).toBeDefined();
    expect(healed.type).toBe("element");
    expect(checkAllNodesAreElements(healed)).toBe(true);
  });

  // Test Character PersonaGenerator example
  it("should convert Character PersonaGenerator example to a valid element tree", async () => {
    const filePath = join(
      process.cwd(),
      "..",
      "..",
      "examples",
      "Character PersonaGenerator",
      "index.aiml"
    );
    const content = readFileSync(filePath, "utf-8");
    const file = new VFile({ path: filePath, value: content });

    const result = await parseMDXFilesToAIML([file]);
    const healed = astToRunnableBaseElementTree(result.nodes);

    expect(healed).toBeDefined();
    expect(healed.type).toBe("element");
    expect(checkAllNodesAreElements(healed)).toBe(true);
  });

  // Test CodeReviewer example
  it("should convert CodeReviewer example to a valid element tree", async () => {
    const filePath = join(
      process.cwd(),
      "..",
      "..",
      "examples",
      "CodeReviewer",
      "index.aiml"
    );
    const content = readFileSync(filePath, "utf-8");
    const file = new VFile({ path: filePath, value: content });

    const result = await parseMDXFilesToAIML([file]);
    const healed = astToRunnableBaseElementTree(result.nodes);

    expect(healed).toBeDefined();
    expect(healed.type).toBe("element");
    expect(checkAllNodesAreElements(healed)).toBe(true);
  });

  // Test InvestmentAdvisor example
  it("should convert InvestmentAdvisor example to a valid element tree", async () => {
    const filePath = join(
      process.cwd(),
      "..",
      "..",
      "examples",
      "InvestmentAdvisor",
      "index.aiml"
    );
    const content = readFileSync(filePath, "utf-8");
    const file = new VFile({ path: filePath, value: content });

    const result = await parseMDXFilesToAIML([file]);
    const healed = astToRunnableBaseElementTree(result.nodes);

    expect(healed).toBeDefined();
    expect(healed.type).toBe("element");
    expect(checkAllNodesAreElements(healed)).toBe(true);
  });

  // Test MedicalDiagnosis example
  it("should convert MedicalDiagnosis example to a valid element tree", async () => {
    const filePath = join(
      process.cwd(),
      "..",
      "..",
      "examples",
      "MedicalDiagnosis",
      "index.aiml"
    );
    const content = readFileSync(filePath, "utf-8");
    const file = new VFile({ path: filePath, value: content });

    const result = await parseMDXFilesToAIML([file]);
    const healed = astToRunnableBaseElementTree(result.nodes);

    expect(healed).toBeDefined();
    expect(healed.type).toBe("element");
    expect(checkAllNodesAreElements(healed)).toBe(true);
  });

  // Test RecipeGenerator example
  it("should convert RecipeGenerator example to a valid element tree", async () => {
    const filePath = join(
      process.cwd(),
      "..",
      "..",
      "examples",
      "RecipeGenerator",
      "index.aiml"
    );
    const content = readFileSync(filePath, "utf-8");
    const file = new VFile({ path: filePath, value: content });

    const result = await parseMDXFilesToAIML([file]);
    const healed = astToRunnableBaseElementTree(result.nodes);

    expect(healed).toBeDefined();
    expect(healed.type).toBe("element");
    expect(checkAllNodesAreElements(healed)).toBe(true);
  });
});
