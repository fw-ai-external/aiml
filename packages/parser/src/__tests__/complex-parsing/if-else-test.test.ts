import { describe, expect, it } from "bun:test";
import { VFile } from "vfile";
import { parseFilesToAIMLNodes } from "../../index";

describe("If/Else Parsing", () => {
  it("should parse a workflow with nested if/else conditionals", async () => {
    const ifElseWorkflow = `
<state id="conditionalState">
    <if condition={value > 10}>
        <assign id="result" value="greater than 10" />
        <else>
            <assign id="result" value="less than or equal to 10" />
        </else>
    </if>
    
    <transition to="next" />
</state>

<final id="next" />
`;

    // Create a VFile with the if/else workflow content
    const testFile = new VFile({
      path: "if-else-workflow.aiml",
      value: ifElseWorkflow,
    });

    try {
      console.log("Starting test for if/else workflow parsing...");

      // Parse the file
      const result = await parseFilesToAIMLNodes([testFile], {
        filePath: "if-else-workflow.aiml",
        preserveCustomTags: true,
      });

      // Log the diagnostics for debugging purposes
      if (result.diagnostics.length > 0) {
        console.log("Diagnostics:", result.diagnostics);
      }

      // Validate the result
      expect(result.nodes).not.toBeNull();
      expect(result.nodes).toBeArrayOfSize(1);
      expect(result.nodes[0].tag).toBe("workflow");

      // Validate states
      const conditionalState = result.nodes[0].children?.find(
        (child) =>
          child.tag === "state" && child.attributes?.id === "conditionalState"
      );
      expect(conditionalState).not.toBeUndefined();

      // Verify the if element exists in the conditionalState
      const ifElement = conditionalState?.children?.find(
        (child) => child.tag === "if"
      );
      expect(ifElement).not.toBeUndefined();

      // Verify the else element exists in the if element
      const elseElement = ifElement?.children?.find(
        (child) => child.tag === "else"
      );
      expect(elseElement).not.toBeUndefined();

      // Verify the transition element exists in the conditionalState
      const transitionElement = conditionalState?.children?.find(
        (child) => child.tag === "transition"
      );
      expect(transitionElement).not.toBeUndefined();

      // Validate final state
      const finalState = result.nodes[0].children?.find(
        (child) => child.tag === "final" && child.attributes?.id === "next"
      );
      expect(finalState).not.toBeUndefined();

      console.log("Test completed successfully.");
    } catch (error) {
      console.error("Test failed with error:", error);
      throw error; // Re-throw to fail the test
    }
  });
});
