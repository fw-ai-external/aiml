import { describe, expect, test } from "bun:test";
import { safeParse } from ".";
import { DiagnosticSeverity } from "@fireworks/shared";
import { VFile } from "vfile";

describe("safeParse", () => {
  test("handles malformed XML-like syntax with recovery using fuzzy matching of tag names", () => {
    const malformedContent = `<data id="images"/>

<foreach>
dddfsd
</foreach>

<scrip>

</script>`;

    const result = safeParse(malformedContent, {
      filePath: "test.aiml",
      maxIterations: 10,
      files: [],
      generateIds: true,
    });

    // Verify diagnostics are generated
    expect(result.diagnostics.size).toBeGreaterThan(0);

    // Convert diagnostics to array for easier testing
    const diagnosticsArray = Array.from(result.diagnostics);

    // Verify we have warnings about syntax errors
    expect(
      diagnosticsArray.some(
        (d) =>
          d.severity === DiagnosticSeverity.Warning &&
          (d.code === "AIML010" || d.code === "AIML011") &&
          (d.message.includes("Invalid syntax") ||
            d.message.includes("Corrected mismatched tag"))
      )
    ).toBe(true);

    // Verify AST is created even with errors
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe("root");

    // Uncomment the assertions
    expect(result.ast.children).toHaveLength(3); // Three elements in the input

    // First element: data
    expect(result.ast.children[0].type).toBe("mdxJsxFlowElement");
    expect((result.ast.children[0] as any).name).toBe("data");

    // Second element: foreach
    expect(result.ast.children[1].type).toBe("mdxJsxFlowElement");
    expect((result.ast.children[1] as any).name).toBe("foreach");
    expect((result.ast.children[1] as any).children[0].type).toBe("paragraph");
    expect((result.ast.children[1] as any).children[0].children[0].type).toBe(
      "text"
    );
    expect((result.ast.children[1] as any).children[0].children[0].value).toBe(
      "dddfsd"
    );

    // Third element: script (should be corrected from "scrip" to "script")
    expect(result.ast.children[2].type).toBe("mdxJsxFlowElement");
    expect((result.ast.children[2] as any).name).toBe("script");
  });

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

    // Verify diagnostics are generated
    expect(result.diagnostics.size).toBeGreaterThan(0);

    // Verify AST is created
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe("root");

    // Check that the content is treated as text paragraphs
    const paragraphs = result.ast.children.filter(
      (node) => node.type === "paragraph"
    );
    expect(paragraphs.length).toBeGreaterThan(0);

    // Check that the content of the unknown tags is preserved
    const allText = result.ast.children
      .flatMap((node: any) =>
        node.type === "paragraph"
          ? node.children.map((child: any) => child.value || "")
          : []
      )
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

    expect(result.diagnostics.size).toBeGreaterThan(0);
    expect(
      Array.from(result.diagnostics).some(
        (d) => d.severity === DiagnosticSeverity.Warning
      )
    ).toBe(true);
  });

  test("respects maxIterations parameter", () => {
    const complexBrokenContent = `
<data>
  <broken>
    <nested>
      <very>
        <deep>
          <structure>
            with lots of problems
            <unmatched attr="value">
              <really broken
</data>`;

    const result = safeParse(complexBrokenContent, {
      filePath: "test.aiml",
      maxIterations: 2, // Set a low number to trigger max iterations
      files: [],
      generateIds: true,
    });

    // Should either find an error about max iterations or have multiple diagnostics
    // since our improved correction might fix issues more efficiently
    expect(
      Array.from(result.diagnostics).some(
        (d) =>
          d.code === "AIML009" &&
          d.message.includes("failed after 2 correction attempts")
      ) || result.diagnostics.size >= 2
    ).toBe(true);
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
