import { AimlParser } from "../index";
import { describe, it, expect, beforeEach } from "bun:test";
import { tsToAIML } from "../ts-to-aiml";

describe("AIML Parsing Tests", () => {
  let parser: AimlParser;

  beforeEach(() => {
    parser = new AimlParser();
  });

  describe("Basic AIML Parsing", () => {
    it("should parse a basic AIML file", () => {
      const input = `
---
name: TestWorkflow
---

Some text here with {userInput.message.content}

<workflow id="test">
  <state id="start">
    <customTag>This is a custom tag</customTag>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      parser.setFile({ path: "test.mdx", content: input }, true);

      const result = parser.compile("test.mdx");

      expect(result.ast).not.toBeNull();
      const ourAST = tsToAIML(result.ast!);

      // Enable the expectations now that we have a proper implementation
      expect(ourAST).toBeArrayOfSize(4);
      expect(ourAST[0].type).toBe("header");
      expect(ourAST[0].children).toBeArrayOfSize(1);
      expect(ourAST[0].children?.[0]?.type).toBe("headerField");
      expect(ourAST[0].children?.[0]?.id).toBe("name");
      expect(ourAST[0].children?.[0]?.value).toBe("TestWorkflow");

      expect(ourAST[1].type).toBe("text");
      expect(ourAST[2].type).toBe("expression");
      expect(ourAST[2].value).toBe("userInput.message.content");
      expect(ourAST[3].type).toBe("element");
    });

    it("should parse an even more complex AIML file", () => {
      const input = `
---
name: TestWorkflow
---

Some text here with {userInput.message.content.toLowerCase()}
<customTag>This is a custom tag so it is just a text node</customTag>

<transition 
target="end" />
  
      `;

      parser.setFile({ path: "test.mdx", content: input }, true);

      const result = parser.compile("test.mdx");
      expect(result.ast).not.toBeNull();

      const ourAST = tsToAIML(result.ast!);

      // Enable the expectations now that we have a proper implementation
      expect(ourAST).toBeArrayOfSize(5);
      expect(ourAST[0].type).toBe("header");
      expect(ourAST[0].children).toBeArrayOfSize(1);
      expect(ourAST[0].children?.[0]?.type).toBe("headerField");
      expect(ourAST[0].children?.[0]?.id).toBe("name");
      expect(ourAST[0].children?.[0]?.value).toBe("TestWorkflow");

      expect(ourAST[1].type).toBe("text");
      expect(ourAST[2].type).toBe("expression");
      expect(ourAST[2].value).toBe("userInput.message.content.toLowerCase()");
      expect(ourAST[3].type).toBe("text");
      // this is just text, ignore that it looks like JSX
      expect(ourAST[3].value).toBe(
        "<customTag>This is a custom tag so it is just a text node</customTag>"
      );
      expect(ourAST[4].type).toBe("element");
      expect(ourAST[4].tag).toBe("transition");
      expect(ourAST[4].attributes).toBeObject();
      expect(ourAST[4].attributes?.target).toBe("end");
    });
  });
  describe("Multi-file", () => {
    it("should handle imports between AIML files", () => {
      // Create a file that will be imported
      const importedFile = `
---
name: ImportedComponent
---

<message>This is a reusable component</message>
      `;

      // Create a main file that imports the other file
      const mainFile = `
---
name: Main Workflow
---
import ImportedComponent from "./imported-component";

<workflow id="main">
  <step id="start">
    <ImportedComponent />
  </step>
</workflow>
      `;

      // Add both files to the parser
      parser.setFile(
        { path: "imported-component.aiml", content: importedFile },
        true
      );
      parser.setFile({ path: "main-workflow.aiml", content: mainFile }, true);

      // Compile the main file
      const result = parser.compile("main-workflow.aiml");
      expect(result.ast).not.toBeNull();

      const ourAST = tsToAIML(result.ast!);

      // Verify the structure of the compiled AST
      expect(ourAST).toBeArrayOfSize(3);

      // Check header
      expect(ourAST[0].type).toBe("header");
      expect(ourAST[0].children?.[0]?.type).toBe("headerField");
      expect(ourAST[0].children?.[0]?.id).toBe("name");
      expect(ourAST[0].children?.[0]?.value).toBe("Main Workflow");

      // Check import element
      expect(ourAST[1].type).toBe("import");
      expect(ourAST[1].filePath).toBe("./imported-component.aiml");

      // Check workflow element
      expect(ourAST[2].type).toBe("element");
      expect(ourAST[2].tag).toBe("workflow");
      expect(ourAST[2].attributes?.id).toBe("main");

      // Check step element inside workflow
      expect(ourAST[2].children).toBeArrayOfSize(1);
      expect(ourAST[2].children?.[0]?.type).toBe("element");
      expect(ourAST[2].children?.[0]?.tag).toBe("step");
      expect(ourAST[2].children?.[0]?.attributes?.id).toBe("start");

      // Check children of step element
      expect(ourAST[2].children?.[0]?.children).toBeArrayOfSize(1);
      expect(ourAST[2].children?.[0]?.children?.[0]?.type).toBe("element");
      expect(ourAST[2].children?.[0]?.children?.[0]?.tag).toBe(
        "ImportedComponent"
      );
    });
  });
});
