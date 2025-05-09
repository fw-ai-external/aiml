import type {
  SerializedBaseElement,
  CommentNode,
} from "@aiml/shared";

/**
 * Step 7: Assign comments to workflow
 */
export function assignCommentsToWorkflow(
  workflowNode: SerializedBaseElement,
  comments: CommentNode[]
): SerializedBaseElement {
  if (comments.length === 0) {
    return workflowNode;
  }

  // Create a deep copy of the workflow to avoid mutations
  const newWorkflow = JSON.parse(JSON.stringify(workflowNode));

  // Helper function to assign comments to elements
  const assignCommentsToElement = (
    element: SerializedBaseElement,
    remainingComments: CommentNode[]
  ): { element: SerializedBaseElement; remainingComments: CommentNode[] } => {
    const elementComments: CommentNode[] = [];
    const otherComments: CommentNode[] = [];

    for (const comment of remainingComments) {
      if (comment.lineEnd <= element.lineStart) {
        elementComments.push(comment);
      } else {
        otherComments.push(comment);
      }
    }

    const newElement = { ...element };
    if (elementComments.length > 0) {
      newElement.comments = elementComments;
    }

    if (newElement.children) {
      const newChildren: SerializedBaseElement[] = [];
      let currentComments = [...otherComments];

      for (const child of newElement.children) {
        if (child.astSourceType === "element") {
          const result = assignCommentsToElement(child, currentComments);
          newChildren.push(result.element);
          currentComments = result.remainingComments;
        } else {
          newChildren.push(child);
        }
      }

      newElement.children = newChildren;
      return { element: newElement, remainingComments: currentComments };
    }

    return { element: newElement, remainingComments: otherComments };
  };

  const result = assignCommentsToElement(newWorkflow, comments);
  return result.element;
}
