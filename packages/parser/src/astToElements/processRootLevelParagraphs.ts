import type {
  SerializedBaseElement,
  ElementType,
  ElementSubType,
} from "@aiml/shared";
import { generateKey } from "../utils/helpers.js";
import { convertParagraphToLlmNode } from "../astToElementTree.js";

/**
 * Step 4: Process root level paragraphs
 */
export function processRootLevelParagraphs(
  workflowNode: SerializedBaseElement,
  rootLevelParagraphs: SerializedBaseElement[]
): SerializedBaseElement {
  if (rootLevelParagraphs.length === 0) {
    return workflowNode;
  }

  const newWorkflow = { ...workflowNode };
  const children = [...(newWorkflow.children || [])];

  for (const [index, paragraph] of rootLevelParagraphs.entries()) {
    const stateId = `root-state-${index}`;
    const scope: string[] = ["root", stateId];

    // Convert paragraph to LLM element
    const llmElement = convertParagraphToLlmNode(paragraph, scope);

    // Create state element to wrap the LLM element
    const stateElement: SerializedBaseElement = {
      astSourceType: "element",
      tag: "state",
      type: "state" as ElementType,
      key: generateKey(),
      subType: "state" as ElementSubType,
      attributes: {
        id: stateId,
      },
      scope,
      children: [{ ...llmElement, parentId: stateId }],
      lineStart: paragraph.lineStart,
      lineEnd: paragraph.lineEnd,
      columnStart: paragraph.columnStart,
      columnEnd: paragraph.columnEnd,
      parentId: newWorkflow.id,
    };

    // Add state element to workflow's children
    children.push(stateElement);
  }

  newWorkflow.children = children;
  return newWorkflow;
}
