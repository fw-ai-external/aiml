import { describe, it, expect } from "bun:test";
import { parseMDXFilesToAIML } from ".";
import { VFile } from "vfile";

describe("AIML Parsing Tests", () => {
  describe("Basic AIML Parsing", () => {
    it("should parse a basic AIML file", async () => {
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

      const testFile = new VFile({
        path: "test.mdx",
        value: input,
      });

      const result = await parseMDXFilesToAIML([testFile]);

      expect(result.nodes).not.toBeNull();

      // Enable the expectations now that we have a proper implementation
      expect(result.nodes).toBeArrayOfSize(3);
      expect(result.nodes[0].type).toBe("header");
      expect(result.nodes[0].children).toBeArrayOfSize(1);
      expect(result.nodes[0].children?.[0]?.type).toBe("headerField");
      expect(result.nodes[0].children?.[0]?.id).toBe("name");
      expect(result.nodes[0].children?.[0]?.value).toBe("TestWorkflow");

      expect(result.nodes[1].type).toBe("paragraph");
      expect(result.nodes[1].children?.[0]?.type).toBe("text");
      expect(result.nodes[1].children?.[0]?.value).toBe("Some text here with ");
      expect(result.nodes[1].children?.[1]?.type).toBe("expression");
      expect(result.nodes[1].children?.[1]?.value).toBe(
        "userInput.message.content"
      );
      expect(result.nodes[2].type).toBe("element");
      expect(result.nodes[2].tag).toBe("workflow");
    });

    it("should parse an even more complex AIML file", async () => {
      const input = `
---
name: TestWorkflow
---

Some text here with {userInput.message.content.toLowerCase()}
<customTag>This is a custom tag so it is just a text node</customTag>

<transition 
target="end" />
  
      `;

      const testFile = new VFile({
        path: "test.mdx",
        value: input,
      });

      const result = await parseMDXFilesToAIML([testFile]);
      expect(result.nodes).not.toBeNull();

      // Enable the expectations now that we have a proper implementation
      expect(result.nodes).toBeArrayOfSize(3);
      expect(result.nodes[0].type).toBe("header");
      expect(result.nodes[0].children).toBeArrayOfSize(1);
      expect(result.nodes[0].children?.[0]?.type).toBe("headerField");
      expect(result.nodes[0].children?.[0]?.id).toBe("name");
      expect(result.nodes[0].children?.[0]?.value).toBe("TestWorkflow");

      expect(result.nodes[1].type).toBe("paragraph");
      expect(result.nodes[1].children?.[0]?.type).toBe("text");
      expect(result.nodes[1].children?.[0]?.value).toBe("Some text here with ");
      expect(result.nodes[1].children?.[1]?.type).toBe("expression");
      expect(result.nodes[1].children?.[1]?.value).toBe(
        "userInput.message.content.toLowerCase()"
      );
      expect(result.nodes[1].children?.[2].type).toBe("text");
      // this is just text, ignore that it looks like JSX
      expect(result.nodes[1].children?.[2].value).toBe(
        "\n<customTag>This is a custom tag so it is just a text node</customTag>"
      );
      expect(result.nodes[2].type).toBe("element");
      expect(result.nodes[2].tag).toBe("transition");
      expect(result.nodes[2].attributes).toBeObject();
      expect(result.nodes[2].attributes?.target).toBe("end");
    });
  });
  describe("Multi-file", () => {
    it("should handle imports between AIML files", async () => {
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

Some text here because why not

<workflow id="main">
  <state id="start">
    <ImportedComponent />
  </state>
</workflow>
      `;

      // Create VFile instances for both files
      const importedVFile = new VFile({
        path: "imported-component.aiml",
        value: importedFile,
      });

      const mainVFile = new VFile({
        path: "main-workflow.aiml",
        value: mainFile,
      });

      // Parse the files using parseMDXFilesToAIML
      const result = await parseMDXFilesToAIML([mainVFile, importedVFile]);

      // Verify the structure of the compiled AST
      expect(result.nodes).toBeArrayOfSize(4);

      // Check header
      expect(result.nodes[0].type).toBe("header");
      expect(result.nodes[0].children?.[0]?.type).toBe("headerField");
      expect(result.nodes[0].children?.[0]?.id).toBe("name");
      expect(result.nodes[0].children?.[0]?.value).toBe("Main Workflow");

      // Check import element
      expect(result.nodes[1].type).toBe("import");
      expect(result.nodes[1].filePath).toBe("./imported-component.aiml");

      // Check text
      expect(result.nodes[2].type).toBe("paragraph");
      expect(result.nodes[2].children?.[0]?.type).toBe("text");
      expect(result.nodes[2].children?.[0]?.value).toBe(
        "Some text here because why not"
      );

      // Check workflow element
      expect(result.nodes[3].type).toBe("element");
      expect(result.nodes[3].tag).toBe("workflow");
      expect(result.nodes[3].attributes?.id).toBe("main");

      // Check step element inside workflow
      expect(result.nodes[3].children).toBeArrayOfSize(1);
      expect(result.nodes[3].children?.[0]?.type).toBe("element");
      expect(result.nodes[3].children?.[0]?.tag).toBe("state");
      expect(result.nodes[3].children?.[0]?.attributes?.id).toBe("start");

      console.log(result.nodes[3].children?.[0]?.children);
      // Check children of step element
      expect(result.nodes[3].children?.[0]?.children).toBeArrayOfSize(1);
      expect(result.nodes[3].children?.[0]?.children?.[0]?.type).toBe(
        "element"
      );
      expect(result.nodes[3].children?.[0]?.children?.[0]?.tag).toBe(
        "ImportedComponent"
      );
    });
  });
});
