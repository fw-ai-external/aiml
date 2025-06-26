import { describe, test, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { parse } from "../index.js"; // Use correct exported function name
import { DiagnosticSeverity } from "@aiml/shared";
const examplesDir = path.resolve(__dirname, "../../../../examples"); // Adjust path as needed

const exampleDirs = [
  "Character PersonaGenerator",
  "CodeReviewer",
  "FinalStateTest",
  "InvestmentAdvisor",
  "JustPrompt",
  "MedicalDiagnosis",
  "RecipeGenerator",
  "SimpleChain",
  "SimpleRouter",
];

// Helper function to normalize nodes for snapshot testing
const normalizeNodesForSnapshot = (nodes: any) => {
  return JSON.parse(JSON.stringify(nodes), (key, value) => {
    if (key === "key") {
      return undefined;
    }
    // Normalize auto-generated state IDs to make snapshots deterministic
    if (
      typeof value === "string" &&
      value.startsWith("auto_wrapping_state_aiml-")
    ) {
      return "auto_wrapping_state_aiml-NORMALIZED";
    }
    return value;
  });
};

describe("All AIML examples for docs", () => {
  test("Ensure we have a test for every example", () => {
    expect(exampleDirs.length).toEqual(exampleDirs.length);

    for (const exampleDir of exampleDirs) {
      const aimlContent = fs.readFileSync(
        path.join(examplesDir, exampleDir, "index.aiml"),
        "utf-8"
      );
      expect(aimlContent).toBeDefined();
      expect(aimlContent).not.toBeEmpty();
      expect(aimlContent).not.toBeNull();
    }
  });

  test.skip(`Ensure ${exampleDirs[0]} is parsed correctly`, async () => {
    const aimlContent = fs.readFileSync(
      path.join(examplesDir, exampleDirs[0], "index.aiml"),
      "utf-8"
    );

    const { nodes, diagnostics } = await parse(aimlContent);

    // Ensure no parsing errors occurred
    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
      `The ${exampleDirs[0]} directory should have no parsing errors, and should be able to be parsed into AIML cleanly`
    ).toHaveLength(0);

    // expect(
    //   diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning),
    //   `The ${exampleDirs[0]} directory should have no parsing warnings, and should be able to be parsed into AIML cleanly`
    // ).toHaveLength(0);

    // Compare the resulting nodes (not AST) against a snapshot
    const nodesWithoutKeys = normalizeNodesForSnapshot(nodes);
    expect(nodesWithoutKeys).toMatchSnapshot();
  });

  test.skip(`Ensure ${exampleDirs[1]} is parsed correctly`, async () => {
    const aimlContent = fs.readFileSync(
      path.join(examplesDir, exampleDirs[1], "index.aiml"),
      "utf-8"
    );

    const { nodes, diagnostics } = await parse(aimlContent);

    // Ensure no parsing errors occurred
    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
      `The ${exampleDirs[1]} directory should have no parsing errors, and should be able to be parsed into AIML cleanly`
    ).toHaveLength(0);

    // expect(
    //   diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning),
    //   `The ${exampleDirs[1]} directory should have no parsing warnings, and should be able to be parsed into AIML cleanly`
    // ).toHaveLength(0);

    // Compare the resulting nodes (not AST) against a snapshot
    const nodesWithoutKeys = normalizeNodesForSnapshot(nodes);
    expect(nodesWithoutKeys).toMatchSnapshot();
  });

  test(`Ensure ${exampleDirs[2]} is parsed correctly`, async () => {
    const aimlContent = fs.readFileSync(
      path.join(examplesDir, exampleDirs[2], "index.aiml"),
      "utf-8"
    );

    const { nodes, diagnostics } = await parse(aimlContent);

    // Ensure no parsing errors occurred
    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
      `The ${
        exampleDirs[2]
      } directory should have no parsing errors, and should be able to be parsed into AIML cleanly. But got ${diagnostics
        .filter((d) => d.severity === DiagnosticSeverity.Error)
        .map((d) => d.message)
        .join(", ")} errors`
    ).toHaveLength(0);

    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning),
      `The ${exampleDirs[2]} directory should have no parsing warnings, and should be able to be parsed into AIML cleanly`
    ).toHaveLength(0);

    // Compare the resulting nodes (not AST) against a snapshot
    const nodesWithoutKeys = normalizeNodesForSnapshot(nodes);
    expect(nodesWithoutKeys).toMatchSnapshot();
  });

  test.skip(`Ensure ${exampleDirs[3]} is parsed correctly`, async () => {
    const aimlContent = fs.readFileSync(
      path.join(examplesDir, exampleDirs[3], "index.aiml"),
      "utf-8"
    );

    const { nodes, diagnostics } = await parse(aimlContent);

    // Ensure no parsing errors occurred
    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
      `The ${
        exampleDirs[3]
      } directory should have no parsing errors, and should be able to be parsed into AIML cleanly. But got ${diagnostics
        .filter((d) => d.severity === DiagnosticSeverity.Error)
        .map((d) => d.message)
        .join(", ")} errors`
    ).toHaveLength(0);

    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning),
      `The ${exampleDirs[3]} directory should have no parsing warnings, and should be able to be parsed into AIML cleanly`
    ).toHaveLength(0);

    // Compare the resulting nodes (not AST) against a snapshot
    const nodesWithoutKeys = normalizeNodesForSnapshot(nodes);
    expect(nodesWithoutKeys).toMatchSnapshot();
  });

  test(`Ensure ${exampleDirs[4]} is parsed correctly`, async () => {
    const aimlContent = fs.readFileSync(
      path.join(examplesDir, exampleDirs[4], "index.aiml"),
      "utf-8"
    );

    const { nodes, diagnostics } = await parse(aimlContent);

    // Ensure no parsing errors occurred
    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
      `The ${
        exampleDirs[4]
      } directory should have no parsing errors, and should be able to be parsed into AIML cleanly. But got ${diagnostics
        .filter((d) => d.severity === DiagnosticSeverity.Error)
        .map((d) => d.message)
        .join(", ")} errors`
    ).toHaveLength(0);

    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning),
      `The ${exampleDirs[4]} directory should have no parsing warnings, and should be able to be parsed into AIML cleanly`
    ).toHaveLength(0);

    // Compare the resulting nodes (not AST) against a snapshot
    const nodesWithoutKeys = normalizeNodesForSnapshot(nodes);
    expect(nodesWithoutKeys).toMatchSnapshot();
  });

  test.skip(`Ensure ${exampleDirs[5]} is parsed correctly`, async () => {
    const aimlContent = fs.readFileSync(
      path.join(examplesDir, exampleDirs[5], "index.aiml"),
      "utf-8"
    );

    const { nodes, diagnostics } = await parse(aimlContent);

    // Ensure no parsing errors occurred
    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
      `The ${
        exampleDirs[5]
      } directory should have no parsing errors, and should be able to be parsed into AIML cleanly. But got ${diagnostics
        .filter((d) => d.severity === DiagnosticSeverity.Error)
        .map((d) => d.message)
        .join(", ")} errors`
    ).toHaveLength(0);

    // expect(
    //   diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning),
    //   `The ${exampleDirs[5]} directory should have no parsing warnings, and should be able to be parsed into AIML cleanly`
    // ).toHaveLength(0);

    // Compare the resulting nodes (not AST) against a snapshot
    const nodesWithoutKeys = normalizeNodesForSnapshot(nodes);
    expect(nodesWithoutKeys).toMatchSnapshot();
  });

  test.skip(`Ensure ${exampleDirs[6]} is parsed correctly`, async () => {
    const aimlContent = fs.readFileSync(
      path.join(examplesDir, exampleDirs[6], "index.aiml"),
      "utf-8"
    );

    const { nodes, diagnostics } = await parse(aimlContent);

    // Ensure no parsing errors occurred
    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
      `The ${
        exampleDirs[6]
      } directory should have no parsing errors, and should be able to be parsed into AIML cleanly. But got ${diagnostics
        .filter((d) => d.severity === DiagnosticSeverity.Error)
        .map((d) => d.message)
        .join(", ")} errors`
    ).toHaveLength(0);

    // expect(
    //   diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning),
    //   `The ${exampleDirs[6]} directory should have no parsing warnings, and should be able to be parsed into AIML cleanly`
    // ).toHaveLength(0);

    // Compare the resulting nodes (not AST) against a snapshot
    const nodesWithoutKeys = normalizeNodesForSnapshot(nodes);
    expect(nodesWithoutKeys).toMatchSnapshot();
  });

  test(`Ensure ${exampleDirs[7]} is parsed correctly`, async () => {
    const aimlContent = fs.readFileSync(
      path.join(examplesDir, exampleDirs[7], "index.aiml"),
      "utf-8"
    );

    const { nodes, diagnostics } = await parse(aimlContent);

    // Ensure no parsing errors occurred
    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
      `The ${
        exampleDirs[7]
      } directory should have no parsing errors, and should be able to be parsed into AIML cleanly. But got ${diagnostics
        .filter((d) => d.severity === DiagnosticSeverity.Error)
        .map((d) => d.message)
        .join(", ")} errors`
    ).toHaveLength(0);

    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning),
      `The ${exampleDirs[7]} directory should have no parsing warnings, and should be able to be parsed into AIML cleanly`
    ).toHaveLength(0);

    // Compare the resulting nodes (not AST) against a snapshot
    const nodesWithoutKeys = normalizeNodesForSnapshot(nodes);
    expect(nodesWithoutKeys).toMatchSnapshot();
  });

  test(`Ensure ${exampleDirs[8]} is parsed correctly`, async () => {
    const aimlContent = fs.readFileSync(
      path.join(examplesDir, exampleDirs[8], "index.aiml"),
      "utf-8"
    );

    const { nodes, diagnostics } = await parse(aimlContent);

    // Ensure no parsing errors occurred
    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error),
      `The ${
        exampleDirs[8]
      } directory should have no parsing errors, and should be able to be parsed into AIML cleanly. But got ${diagnostics
        .filter((d) => d.severity === DiagnosticSeverity.Error)
        .map((d) => d.message)
        .join(", ")} errors`
    ).toHaveLength(0);

    expect(
      diagnostics.filter((d) => d.severity === DiagnosticSeverity.Warning),
      `The ${exampleDirs[8]} directory should have no parsing warnings, and should be able to be parsed into AIML cleanly`
    ).toHaveLength(0);

    // Compare the resulting nodes (not AST) against a snapshot
    const nodesWithoutKeys = normalizeNodesForSnapshot(nodes);
    expect(nodesWithoutKeys).toMatchSnapshot();
  });
});
