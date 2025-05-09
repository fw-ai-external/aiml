import type {
  SerializedBaseElement,
  ElementType,
  ElementSubType,
} from "@aiml/shared";
import { generateKey } from "../utils/helpers.js";

/**
 * Step 5: Add non-paragraph, non-header nodes to workflow
 */
export function addNodesToWorkflow(
  workflowNode: SerializedBaseElement,
  rootLevelNodes: SerializedBaseElement[],
  headerNode: SerializedBaseElement | undefined
): SerializedBaseElement {
  const newWorkflow = { ...workflowNode };
  const children = [...(newWorkflow.children || [])];

  // Find parent nodes recursively by their IDs
  const findParentNode = (
    parentId: string,
    nodes: SerializedBaseElement[],
    workflow: SerializedBaseElement
  ): SerializedBaseElement | undefined => {
    // Check if the parent is the workflow node
    if (workflow.attributes && workflow.attributes.id === parentId) {
      return workflow;
    }

    // Search through all nodes to find the one with matching ID
    for (const rootNode of nodes) {
      // Check if current node is the parent
      if (rootNode.attributes && rootNode.attributes.id === parentId) {
        return rootNode;
      }

      // Check in children recursively
      if (rootNode.children) {
        const queue = [...rootNode.children];
        while (queue.length > 0) {
          const current = queue.shift() as SerializedBaseElement;
          if (current.attributes && current.attributes.id === parentId) {
            return current;
          }
          if (current.children) {
            queue.push(...current.children);
          }
        }
      }
    }

    return undefined;
  };

  // Check if a node has a state ancestor
  const hasStateAncestor = (
    node: SerializedBaseElement,
    nodes: SerializedBaseElement[],
    workflow: SerializedBaseElement
  ): boolean => {
    let currentParentId = node.parentId;
    let parentNode: SerializedBaseElement | undefined;

    while (currentParentId) {
      parentNode = findParentNode(currentParentId, nodes, workflow);
      if (!parentNode) break;

      if (parentNode.subType === ("state" as ElementSubType)) {
        return true;
      }
      currentParentId = parentNode.parentId;
    }

    return false;
  };

  for (const node of rootLevelNodes) {
    if (
      node !== newWorkflow &&
      node !== headerNode &&
      node.astSourceType === "element"
    ) {
      // Handle action elements that aren't already part of a state
      if (node.subType === ("action" as ElementSubType)) {
        // Check if it already has a state ancestor
        if (
          !hasStateAncestor(node, rootLevelNodes, newWorkflow) &&
          !node.parentId
        ) {
          // Wrap action in a state
          const stateElement: SerializedBaseElement = {
            astSourceType: "element",
            type: "state" as ElementType,
            key: generateKey(),
            tag: "state",
            subType: "state" as ElementSubType,
            scope: ["root", `state-${node.key}`],
            attributes: {
              id: `state-${node.key}`,
            },
            children: [{ ...node, parentId: `state-${node.key}` }],
            lineStart: node.lineStart,
            lineEnd: node.lineEnd,
            columnStart: node.columnStart,
            columnEnd: node.columnEnd,
            parentId: newWorkflow.attributes?.id as string,
          };

          // Add to workflow's children
          children.push(stateElement);
        } else if (!node.parentId) {
          // Add directly to workflow if no parent
          children.push({ ...node, parentId: newWorkflow.id });
        }
      } else if (!node.parentId) {
        // Add non-action element directly to workflow if no parent
        children.push({ ...node, parentId: newWorkflow.id });
      }
    }
  }

  newWorkflow.children = children;
  return newWorkflow;
}
