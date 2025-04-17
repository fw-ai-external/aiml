import { describe, expect, it } from "bun:test";
import { VFile } from "vfile";
import { parseMDXFilesToAIML } from "../../index";

describe("Complex Workflow Parsing", () => {
  it("should parse a workflow with datamodel and basic states", async () => {
    const simpleWorkflow = `
<datamodel>
    <data id="nameForOrder" />
    <data id="order" value={[]} />
    <data id="predictedNextAction" value="Greeting & Order Start" />
    <data id="actionHistory" value={[]} />
</datamodel>

<state id="generateResponse">
    <llm instructions="This is a test instruction" prompt="{input}" />
    <transition to="guardrails" />
</state>

<state id="guardrails">
    <llm instructions="Validate the response" prompt="{previousState}" />
    <transition to="respond" />
</state>

<final id="respond" />
`;

    // Create a VFile with the simple workflow content
    const testFile = new VFile({
      path: "simple-workflow.aiml",
      value: simpleWorkflow,
    });

    try {
      // Parse the file
      const result = await parseMDXFilesToAIML([testFile], {
        filePath: "simple-workflow.aiml",
        preserveCustomTags: true,
      });

      // Validate the result
      expect(result.nodes).not.toBeNull();
      expect(result.nodes).toBeArrayOfSize(1);
      expect(result.nodes[0].tag).toBe("workflow");

      // Validate datamodel
      const datamodelElement = result.nodes[0].children?.find(
        (child) => child.tag === "datamodel"
      );
      expect(datamodelElement).not.toBeUndefined();
      expect(datamodelElement?.children?.length).toBe(4); // 4 data elements

      // Validate states
      const generateResponseState = result.nodes[0].children?.find(
        (child) =>
          child.tag === "state" && child.attributes?.id === "generateResponse"
      );
      expect(generateResponseState).not.toBeUndefined();

      // Validate the guardrails state
      const guardrailsState = result.nodes[0].children?.find(
        (child) =>
          child.tag === "state" && child.attributes?.id === "guardrails"
      );
      expect(guardrailsState).not.toBeUndefined();

      // Validate final state
      const finalState = result.nodes[0].children?.find(
        (child) => child.tag === "final" && child.attributes?.id === "respond"
      );
      expect(finalState).not.toBeUndefined();
    } catch (error) {
      console.error("Simple test failed with error:", error);
      throw error; // Re-throw to fail the test
    }
  });

  it("should parse a workflow with nested conditional elements", async () => {
    // Breaking down the complex workflow into smaller chunks that the parser can handle
    const nestedWorkflow = `
<datamodel>
    <data id="nameForOrder" />
    <data id="order" value={[]} />
    <data id="actionHistory" value={[]} />
</datamodel>

<state id="generateResponse">
    <llm instructions="This is a test instruction" prompt="{input}" />
    <assign id="response" value="{ctx.lastElement.response}" />
    <transition to="processActions" />
</state>

<state id="processActions">
    <if condition="{currentAction.action === 'addItem'}">
        <assign id="order" action="append" value="{{name: currentAction.itemName, quantity: 1}}" />
    </if>
    <transition to="guardrails" />
</state>

<state id="guardrails">
    <llm instructions="Validate the response" prompt="{previousState}" />
    <if condition="{ctx.lastElement.result === 'true'}">
        <transition to="respond" />
    </if>
    <if condition="{ctx.lastElement.result !== 'true'}">
        <transition to="generateResponse" />
    </if>
</state>

<final id="respond" />
`;

    // Create a VFile with the nested workflow content
    const testFile = new VFile({
      path: "nested-workflow.aiml",
      value: nestedWorkflow,
    });

    try {
      console.log("Starting test for nested workflow parsing...");

      // Parse the file
      const result = await parseMDXFilesToAIML([testFile], {
        filePath: "nested-workflow.aiml",
        preserveCustomTags: true,
      });

      // Log the diagnostics for debugging purposes
      if (result.diagnostics.length > 0) {
        console.log("Nested workflow diagnostics:", result.diagnostics);
      }

      // Validate the result
      expect(result.nodes).not.toBeNull();
      expect(result.nodes).toBeArrayOfSize(1);
      expect(result.nodes[0].tag).toBe("workflow");

      // Validate datamodel
      const datamodelElement = result.nodes[0].children?.find(
        (child) => child.tag === "datamodel"
      );
      expect(datamodelElement).not.toBeUndefined();
      expect(datamodelElement?.children?.length).toBe(3); // 3 data elements

      // Validate states
      const generateResponseState = result.nodes[0].children?.find(
        (child) =>
          child.tag === "state" && child.attributes?.id === "generateResponse"
      );
      expect(generateResponseState).not.toBeUndefined();

      // Validate the processActions state
      const processActionsState = result.nodes[0].children?.find(
        (child) =>
          child.tag === "state" && child.attributes?.id === "processActions"
      );
      expect(processActionsState).not.toBeUndefined();

      // Validate the guardrails state
      const guardrailsState = result.nodes[0].children?.find(
        (child) =>
          child.tag === "state" && child.attributes?.id === "guardrails"
      );
      expect(guardrailsState).not.toBeUndefined();

      // Validate final state
      const finalState = result.nodes[0].children?.find(
        (child) => child.tag === "final" && child.attributes?.id === "respond"
      );
      expect(finalState).not.toBeUndefined();

      console.log("Nested test completed successfully.");
    } catch (error) {
      console.error("Nested test failed with error:", error);
      throw error; // Re-throw to fail the test
    }
  });
});
