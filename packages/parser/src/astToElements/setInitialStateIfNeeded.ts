import type {
  SerializedBaseElement,
  ElementSubType,
} from "@aiml/shared";

/**
 * Step 8: Set initial state if needed
 */
export function setInitialStateIfNeeded(
  workflowNode: SerializedBaseElement
): SerializedBaseElement {
  if (!workflowNode.children || workflowNode.children.length === 0) {
    return workflowNode;
  }

  const newWorkflow = { ...workflowNode };
  const attributes = { ...(newWorkflow.attributes || {}) };

  if (!attributes.initial) {
    const firstState = newWorkflow.children?.find(
      (child) => child.subType === ("state" as ElementSubType)
    );

    if (firstState?.attributes?.id) {
      attributes.initial = firstState.attributes.id;
    }
  }

  newWorkflow.attributes = attributes;
  return newWorkflow;
}
