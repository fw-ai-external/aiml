import type {
  SerializedBaseElement,
  CommentNode,
} from "@aiml/shared";

/**
 * Assign comments to elements based on their position in the document
 */
export function assignCommentsToElement(
  element: SerializedBaseElement,
  remainingComments: CommentNode[]
): void {
  const elementComments: CommentNode[] = [];
  const otherComments: CommentNode[] = [];

  for (const comment of remainingComments) {
    if (comment.lineEnd <= element.lineStart) {
      elementComments.push(comment);
    } else {
      otherComments.push(comment);
    }
  }

  if (elementComments.length > 0) {
    element.comments = elementComments;
  }

  if (element.children) {
    for (const child of element.children) {
      if (child.astSourceType === "element") {
        assignCommentsToElement(child, otherComments);
      }
    }
  }
}
