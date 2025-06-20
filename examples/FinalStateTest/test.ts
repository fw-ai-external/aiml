import { readFileSync } from "fs";
import { join } from "path";
import { VFile } from "vfile";
import { parseFilesToAIMLNodes } from "../../packages/parser/src";

// Helper function to print a simplified view of the execution graph
function printGraph(node: any, indent = 0) {
  const spaces = " ".repeat(indent);

  if (node.next && node.next.length > 0) {
    node.next.forEach((next: any) => {
      printGraph(next, indent + 2);
    });
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach((child: any) => {
      printGraph(child, indent + 2);
    });
  }
}

async function testFinalStateAddition() {
  // Read the AIML file
  const aimlPath = join(__dirname, "index.aiml");
  const content = readFileSync(aimlPath, "utf-8");

  // Parse the file
  const file = new VFile({ path: aimlPath, value: content });
  const result = await parseFilesToAIMLNodes([file]);

  // Check if a final element was added automatically
  const workflow = result.nodes[0];

  // Look for final element
  const finalElement = workflow.children?.find(
    (child) => child.tag === "final"
  );

  if (finalElement) {
    console.log(
      `✅ Final element was automatically added: ${finalElement.attributes?.id}`
    );
  } else {
    console.log("❌ No final element was found!");
  }

  // Parse the elements from the file
  const startState = workflow.children?.find(
    (child) => child.tag === "state" && child.attributes?.id === "start"
  );

  const anotherState = workflow.children?.find(
    (child) => child.tag === "state" && child.attributes?.id === "another_state"
  );

  const thirdState = workflow.children?.find(
    (child) => child.tag === "state" && child.attributes?.id === "third_state"
  );

  // Now we need to build the execution graph to check transitions
  // Import necessary code from @aiml/runtime
  // This is a simplified version since we don't have those modules available directly

  workflow.children?.forEach((child: any) => {
    console.log(`- ${child.tag} (${child.attributes?.id})`);
  });

  console.log("\nVerification:");
  console.log(`- Start state found: ${startState ? "✅" : "❌"}`);
  console.log(`- Another state found: ${anotherState ? "✅" : "❌"}`);
  console.log(`- Third state found: ${thirdState ? "✅" : "❌"}`);
  console.log(`- Final state found: ${finalElement ? "✅" : "❌"}`);

  console.log("\nOur implementation should ensure:");
  console.log(
    "1. Parser automatically adds a <final> element if one does not exist"
  );
  console.log(
    "2. WorkflowElement.onExecutionGraphConstruction ensures leaf nodes (with no explicit transitions) automatically transition to the final element"
  );

  console.log("\nBased on our test example:");
  console.log(
    "- Start state: Should automatically transition to final (leaf node)"
  );
  console.log(
    "- Another state: Should NOT transition to final (has explicit transition to third_state)"
  );
  console.log(
    "- Third state: Should automatically transition to final (leaf node)"
  );
}

// Run the test
testFinalStateAddition().catch(console.error);
