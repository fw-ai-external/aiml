import { describe, expect, test } from "bun:test";
import { safeParse } from ".";
import { DiagnosticSeverity } from "@fireworks/shared";
import { VFile } from "vfile";

describe("safeParse", () => {
  test("handles empty content", () => {
    const result = safeParse("", {
      filePath: "test.aiml",
      maxIterations: 10,
      files: [],
      generateIds: true,
    });

    expect(result.diagnostics.size).toBe(0);
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe("root");
    expect(result.ast.children).toHaveLength(0);
  });

  test("handles valid MDX content", () => {
    const validContent = `# Hello
    
This is a paragraph.

<data id="valid" />`;

    const result = safeParse(validContent, {
      filePath: "test.aiml",
      maxIterations: 10,
      files: [],
      generateIds: true,
    });

    expect(result.diagnostics.size).toBe(0);
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe("root");
    expect(result.ast.children.length).toBeGreaterThan(0);
  });

  test("treats unknown tags that don't fuzzy match as text/paragraphs", () => {
    const contentWithUnknownTags = `<completelyfaketag>
This is some text inside an unknown tag
</completelyfaketag>

Some regular paragraph text.

<anotherfaketag attr="value">
  With some nested content
</anotherfaketag>`;

    const result = safeParse(contentWithUnknownTags, {
      filePath: "test.aiml",
      maxIterations: 10,
      files: [],
      generateIds: true,
    });

    // Verify AST is created
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe("root");

    // Check that the content is treated as text paragraphs
    const paragraphs = result.ast.children.filter(
      (node) => node.type === "paragraph" || node.type === "text"
    );
    expect(paragraphs.length).toBeGreaterThan(0);

    // Check that the content of the unknown tags is preserved
    // The AST structure has text nodes and paragraph nodes at the root level
    const allText = result.ast.children
      .map((node: any) => {
        if (node.type === "text") {
          return `${node.value}\n`;
        } else if (node.type === "paragraph" && node.children) {
          return node.children.map((child: any) => `${child.value}\n`).join("");
        }
        return "";
      })
      .join("");

    // The text should contain our original content in some form
    expect(allText).toContain(`<completelyfaketag>
This is some text inside an unknown tag
</completelyfaketag>`);
    expect(allText).toContain("Some regular paragraph text");

    expect(allText).toContain(`<anotherfaketag attr="value">
With some nested content
</anotherfaketag>`);
  });

  test("handles unclosed tags", () => {
    const unclosedContent = `<data id="test">
Some content
<nested>
More content`;

    const result = safeParse(unclosedContent, {
      filePath: "test.aiml",
      maxIterations: 10,
      files: [],
      generateIds: true,
    });

    expect(result.diagnostics.size).toBe(0);
  });

  test("handles files with imports", () => {
    const mainContent = `
import { Component } from "./component.aiml"

<data id="main">
  <Component />
</data>`;

    const componentFile = new VFile({
      path: "component.aiml",
      value: `<data id="component">Component content</data>`,
    });

    const result = safeParse(mainContent, {
      filePath: "main.aiml",
      maxIterations: 10,
      files: [componentFile],
      generateIds: true,
    });

    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe("root");
    // The import should be processed without errors or only with warnings
    expect(
      result.diagnostics.size === 0 ||
        !Array.from(result.diagnostics).some(
          (d) => d.severity === DiagnosticSeverity.Error
        )
    ).toBe(true);
  });
});
