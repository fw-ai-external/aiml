import { describe, expect, it } from "bun:test";
import { VFile } from "vfile";
import { parseMDXFilesToAIML } from ".";

describe("AIML Parsing Tests", () => {
  describe("Basic AIML Parsing", () => {
    it.skip("should parse just a prompt into a workflow", async () => {
      const input = `Hi!`;

      const testFile = new VFile({
        path: "test.mdx",
        value: input,
      });

      const result = await parseMDXFilesToAIML([testFile], {
        filePath: "test.mdx",
        files: [],
        preserveCustomTags: true,
      });

      expect(result.nodes).not.toBeNull();
      expect(result.nodes).toBeArrayOfSize(1);
      expect(result.nodes[0].tag).toBe("workflow");

      // Since we automatically add a final element if one is not present,
      // we should expect at least 2 children: the state (for the paragraph) and the final element
      expect(result.nodes[0].children!.length).toBeGreaterThanOrEqual(2);

      // Check that there's a final element among the children
      const hasFinalElement = result.nodes[0].children!.some(
        (child) => child.tag === "final"
      );
      expect(hasFinalElement).toBe(true);

      // Find the state element (not necessarily the first child now)
      const stateElement = result.nodes[0].children!.find(
        (child) => child.tag === "state"
      );
      expect(stateElement).not.toBeUndefined();
      // The state should not be an error state that was added by the healing code
      // it should be a new state created by the parser to wrap the paragraph/llm element
      expect(stateElement?.attributes?.id).not.toBe("error");

      // The state should have at least the llm element, and may have a transition added by the healing code
      expect(stateElement?.children?.length).toBeGreaterThanOrEqual(1);

      // Find the llm element
      const llmElement = stateElement?.children?.find(
        (child) => child.tag === "llm"
      );
      expect(llmElement).not.toBeUndefined();
      expect(llmElement?.attributes?.instructions).toBe("Hi!");
    });
    it.skip("should parse a basic  but full AIML file", async () => {
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
      expect(result.nodes).toBeArrayOfSize(1);

      // The parser now wraps everything in a single workflow element
      const workflow = result.nodes[0];
      expect(workflow.tag).toBe("workflow");

      // With the updated parser, workflow attributes may not include the header fields directly
      // Let's check for the workflow id instead, which we know should be there
      expect(workflow.attributes?.id).toBe("test");

      // Check for a state element that contains the paragraph as an LLM element
      const states =
        workflow.children?.filter((child) => child.tag === "state") || [];
      expect(states.length).toBeGreaterThan(0);

      // Find the state containing the LLM element with our text content
      const textState = states.find((state) =>
        state.children?.some(
          (child) =>
            child.tag === "llm" &&
            typeof child.attributes?.instructions === "string" &&
            child.attributes.instructions.includes(
              "Some text here with ${userInput.message.content}"
            )
        )
      );
      expect(textState).not.toBeUndefined();

      // Verify the original workflow element is preserved as a child
      const workflowChild = workflow.children?.find(
        (child) => child.tag === "state" && child.attributes?.id === "start"
      );
      expect(workflowChild).not.toBeUndefined();
    });

    it.skip("should parse an even more complex AIML file", async () => {
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
      expect(result.nodes).toBeArrayOfSize(1);

      // The parser now wraps everything in a single workflow element
      const workflow = result.nodes[0];
      expect(workflow.tag).toBe("workflow");

      // With the updated parser, workflow attributes may not include the header fields directly
      // Instead, the workflow is given an auto-generated id
      expect(workflow.attributes?.id).toBe("workflow-root");

      // There should be multiple state elements
      const states =
        workflow.children?.filter((child) => child.tag === "state") || [];
      expect(states.length).toBeGreaterThan(0);

      // Find the state containing the LLM element with our expression
      const textState = states.find((state) =>
        state.children?.some(
          (child) =>
            child.tag === "llm" &&
            typeof child.attributes?.instructions === "string" &&
            child.attributes.instructions.includes(
              "${userInput.message.content.toLowerCase()}"
            )
        )
      );
      expect(textState).not.toBeUndefined();

      // Find the transition element
      const transitionState = states.find((state) =>
        state.children?.some(
          (child) =>
            child.tag === "transition" && child.attributes?.target === "end"
        )
      );
      expect(transitionState).not.toBeUndefined();
    });
  });
  describe("Multi-file", () => {
    it.skip("should handle imports between AIML files", async () => {
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
      const result = await parseMDXFilesToAIML([mainVFile, importedVFile], {
        filePath: "main-workflow.aiml",
        files: [importedVFile],
        preserveCustomTags: true,
      });

      // Verify the structure - now it's a single workflow node
      expect(result.nodes).toBeArrayOfSize(1);

      // The workflow node should have the main attributes
      const workflow = result.nodes[0];
      expect(workflow.tag).toBe("workflow");

      // With the updated parser, the id is used from the explicit workflow tag
      expect(workflow.attributes?.id).toBe("main");

      // There should be a state element with an ImportedComponent
      const startState = workflow.children?.find(
        (child) => child.tag === "state" && child.attributes?.id === "start"
      );
      expect(startState).not.toBeUndefined();

      if (startState) {
        // The state should have the ImportedComponent element and may have transitions added by the healing code
        expect(startState.children?.length).toBeGreaterThanOrEqual(1);

        // Find the message element from the imported component
        const messageElement = startState.children?.find(
          (child) => child.tag === "message"
        );
        expect(messageElement).not.toBeUndefined();
        expect(messageElement?.tag).toBe("message");
      }

      // There should be states for the paragraphs
      const textStates =
        workflow.children?.filter(
          (child) =>
            child.tag === "state" &&
            child.children?.some(
              (grandchild) =>
                grandchild.tag === "llm" &&
                typeof grandchild.attributes?.instructions === "string" &&
                grandchild.attributes.instructions.includes(
                  "Some text here because why not"
                )
            )
        ) || [];
      expect(textStates.length).toBeGreaterThan(0);
    });
  });

  describe("Paragraph Merging", () => {
    it.skip("should merge adjacent paragraphs and combine their children", async () => {
      const input = `
---
name: ParagraphMergeTest
---

First paragraph with {expression1}.

Second paragraph with {expression2}.

Third paragraph (should be merged with above due to blank line).

      `;

      const testFile = new VFile({
        path: "test.mdx",
        value: input,
      });

      const result = await parseMDXFilesToAIML([testFile]);
      expect(result.nodes).not.toBeNull();

      // We should have a single workflow node
      expect(result.nodes).toBeArrayOfSize(1);

      // The workflow node should have a valid id
      const workflow = result.nodes[0];
      expect(workflow.tag).toBe("workflow");
      expect(workflow.attributes?.id).toBe("workflow-root");

      // There should be a state containing an LLM with the merged paragraphs
      const textState = workflow.children?.find(
        (child) =>
          child.tag === "state" &&
          child.children?.some(
            (grandchild) =>
              grandchild.tag === "llm" &&
              typeof grandchild.attributes?.instructions === "string" &&
              grandchild.attributes.instructions.includes(
                "First paragraph with ${expression1}"
              ) &&
              grandchild.attributes.instructions.includes(
                "Second paragraph with ${expression2}"
              ) &&
              grandchild.attributes.instructions.includes(
                "Third paragraph (should be merged with above due to blank line)"
              )
          )
      );
      expect(textState).not.toBeUndefined();

      // Extract the prompt to verify the merged paragraphs
      const llmElement = textState?.children?.find(
        (child) => child.tag === "llm"
      );
      expect(llmElement).not.toBeUndefined();

      // Test that all parts of the merged paragraphs are present
      if (
        llmElement &&
        typeof llmElement.attributes?.instructions === "string"
      ) {
        const instructions = llmElement.attributes.instructions;
        expect(instructions).toContain("First paragraph with ${expression1}");
        expect(instructions).toContain("Second paragraph with ${expression2}");
        expect(instructions).toContain(
          "Third paragraph (should be merged with above due to blank line)"
        );
      }
    });
  });
});
