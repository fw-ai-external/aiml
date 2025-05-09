import type {
  SerializedBaseElement,
  ElementType,
  ElementSubType,
} from "@aiml/shared";
import { generateKey } from "../utils/helpers.js";

/**
 * Step 3: Ensure workflow has a final element
 */
export function ensureFinalElement(
  workflowNode: SerializedBaseElement
): SerializedBaseElement {
  const newWorkflow = { ...workflowNode };
  const children = [...(newWorkflow.children || [])];

  // Check if workflow has a final element; if not, add one
  const hasFinalElement = children.some(
    (child) => child.astSourceType === "element" && child.subType === "output"
  );

  if (!hasFinalElement) {
    // Create a final element with a unique ID
    const finalElement: SerializedBaseElement = {
      astSourceType: "element",
      tag: "final",
      key: generateKey(),
      type: "state" as ElementType,
      subType: "output" as ElementSubType,
      attributes: {
        id: "final",
      },
      scope: ["root", "final"],
      children: [],
      lineStart: workflowNode.lineStart,
      lineEnd: workflowNode.lineEnd,
      columnStart: workflowNode.columnStart,
      columnEnd: workflowNode.columnEnd,
      parentId: workflowNode.id,
    };

    // Add the final element to the workflow
    children.push(finalElement);
  }

  newWorkflow.children = children;
  return newWorkflow;
}
