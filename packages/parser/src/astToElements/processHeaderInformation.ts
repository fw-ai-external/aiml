import type {
  SerializedBaseElement,
} from "@aiml/shared";

/**
 * Step 6: Process header information
 */
export function processHeaderInformation(
  workflowNode: SerializedBaseElement,
  headerNode: SerializedBaseElement | undefined
): SerializedBaseElement {
  if (!headerNode || !headerNode.children) {
    return workflowNode;
  }

  const newWorkflow = { ...workflowNode };
  const attributes = { ...(newWorkflow.attributes || {}) };

  for (const field of headerNode.children) {
    if (
      field.astSourceType === "headerField" &&
      field.id &&
      field.value !== undefined
    ) {
      attributes[field.id] = field.value;
    }
  }

  newWorkflow.attributes = attributes;
  return newWorkflow;
}
