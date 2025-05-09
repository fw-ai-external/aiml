import type {
  CommentNode,
  SerializedBaseElement,
} from "@aiml/shared";

/**
 * Step 1: Categorize nodes into different types
 */
export function categorizeNodes(nodes: SerializedBaseElement[]): {
  rootLevelNodes: SerializedBaseElement[];
  comments: CommentNode[];
  rootLevelParagraphs: SerializedBaseElement[];
  headerNode: SerializedBaseElement | undefined;
  workflowNode: SerializedBaseElement | undefined;
} {
  const rootLevelNodes: SerializedBaseElement[] = [];
  const comments: CommentNode[] = [];
  const rootLevelParagraphs: SerializedBaseElement[] = [];
  let headerNode: SerializedBaseElement | undefined;
  let workflowNode: SerializedBaseElement | undefined;

  // First pass: categorize nodes
  for (const node of nodes) {
    if (node.astSourceType === "header") {
      headerNode = node;
      rootLevelNodes.push(node);
    } else if (node.astSourceType === "comment") {
      comments.push(node as CommentNode);
    } else if (node.astSourceType === "text") {
      rootLevelParagraphs.push(node);
    } else if (node.tag === "workflow") {
      workflowNode = node;
      rootLevelNodes.push(node);
    } else {
      rootLevelNodes.push(node);
    }
  }

  return {
    rootLevelNodes,
    comments,
    rootLevelParagraphs,
    headerNode,
    workflowNode,
  };
}
