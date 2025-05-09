import type {
  SerializedBaseElement,
  ElementType,
  ElementSubType,
} from "@aiml/shared";
import { generateKey } from "../utils/helpers.js";

/**
 * Step 2: Create or ensure workflow node exists
 */
export function ensureWorkflowNode(
  workflowNode: SerializedBaseElement | undefined
): SerializedBaseElement {
  if (workflowNode) {
    return { ...workflowNode };
  }

  // Create workflow node if one doesn't exist
  return {
    astSourceType: "element",
    tag: "workflow",
    key: generateKey(),
    type: "state" as ElementType,
    scope: ["root"],
    subType: "human-input" as ElementSubType,
    attributes: {
      id: "workflow-root",
    },
    children: [],
    lineStart: 1,
    lineEnd: 1,
    columnStart: 1,
    columnEnd: 1,
  };
}
