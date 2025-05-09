import type {
  SerializedBaseElement,
} from "@aiml/shared";
import { categorizeNodes } from "./categorizeNodes.js";
import { ensureWorkflowNode } from "./ensureWorkflowNode.js";
import { ensureFinalElement } from "./ensureFinalElement.js";
import { processRootLevelParagraphs } from "./processRootLevelParagraphs.js";
import { addNodesToWorkflow } from "./addNodesToWorkflow.js";
import { processHeaderInformation } from "./processHeaderInformation.js";
import { assignCommentsToWorkflow } from "./assignCommentsToWorkflow.js";
import { setInitialStateIfNeeded } from "./setInitialStateIfNeeded.js";

/**
 * Process the intermediate nodes into a final structure ready for hydration
 * - Handles root-level paragraphs, converting them to LLM elements wrapped in state elements
 * - Processes and assigns comments
 * - Ensures proper parent-child relationships
 * - Creates a workflow element if one doesn't exist
 */
export function astToElements(
  nodes: SerializedBaseElement[]
): SerializedBaseElement[] {
  // Step 1: Categorize nodes and extract workflow
  const categorized = categorizeNodes(nodes);

  // Step 2: Create or ensure workflow node exists
  const workflowNode = ensureWorkflowNode(categorized.workflowNode);

  // Step 3: Ensure workflow has a final element
  const workflowWithFinal = ensureFinalElement(workflowNode);

  // Step 4: Process root level paragraphs
  const workflowWithParagraphs = processRootLevelParagraphs(
    workflowWithFinal,
    categorized.rootLevelParagraphs
  );

  // Step 5: Add non-paragraph, non-header nodes to workflow
  const workflowWithAllNodes = addNodesToWorkflow(
    workflowWithParagraphs,
    categorized.rootLevelNodes,
    categorized.headerNode
  );

  // Step 6: Process header information
  const workflowWithHeader = processHeaderInformation(
    workflowWithAllNodes,
    categorized.headerNode
  );

  // Step 7: Assign comments to elements
  const workflowWithComments = assignCommentsToWorkflow(
    workflowWithHeader,
    categorized.comments
  );

  // Step 8: Set initial state if needed
  const finalWorkflow = setInitialStateIfNeeded(workflowWithComments);

  // Return the final array with the workflow as the main element
  return [finalWorkflow];
}

// Re-export helper functions for external use if needed
export { healFlowOrError } from "./healFlowOrError.js";
export { addAllTransitions } from "./healFlowOrError.js";
export { assignCommentsToElement } from "./assignCommentsToElement.js";
