import type {
  CommentNode,
  SerializedBaseElement,
  ElementType,
  ElementSubType,
} from "@aiml/shared";
import { generateKey } from "./utils/helpers.js";
import { convertParagraphToLlmNode } from "./astToElementTree.js";

/**
 * Process the intermediate nodes into a final structure ready for hydration
 * - Handles root-level paragraphs, converting them to LLM elements wrapped in state elements
 * - Processes and assigns comments
 * - Ensures proper parent-child relationships
 * - Creates a workflow element if one doesn't exist
 */
export function healInvalidElementTree(
  nodes: SerializedBaseElement[]
): SerializedBaseElement[] {
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
    } else if (node.astSourceType === "paragraph") {
      rootLevelParagraphs.push(node);
    } else if (node.tag === "workflow") {
      workflowNode = node;
      rootLevelNodes.push(node);
    } else {
      rootLevelNodes.push(node);
    }
  }

  // Create workflow node if one doesn't exist
  if (!workflowNode) {
    workflowNode = {
      astSourceType: "element",
      tag: "workflow",
      key: generateKey(),
      type: "state" as ElementType,
      scope: ["root"],
      subType: "human-input" as ElementSubType,
      attributes: {},
      children: [],
      lineStart: 1,
      lineEnd: 1,
      columnStart: 1,
      columnEnd: 1,
    };

    if (!workflowNode.attributes) {
      workflowNode.attributes = {};
    }
    workflowNode.attributes.id = "workflow-root";
    rootLevelNodes.push(workflowNode);
  }

  // Check if workflow has a final element; if not, add one
  let hasFinalElement = false;
  if (workflowNode.children) {
    hasFinalElement = workflowNode.children.some(
      (child) => child.astSourceType === "element" && child.subType === "output"
    );
  }

  if (!hasFinalElement && workflowNode) {
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
    };

    // Add the final element to the workflow
    if (workflowNode.children) {
      workflowNode.children.push(finalElement);
    } else {
      workflowNode.children = [finalElement];
    }

    // Set parent reference
    finalElement.parentId = workflowNode.id;
  }

  // Process root level paragraphs by converting them to LLM elements wrapped in state elements
  if (rootLevelParagraphs.length > 0) {
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
        children: [llmElement],
        lineStart: paragraph.lineStart,
        lineEnd: paragraph.lineEnd,
        columnStart: paragraph.columnStart,
        columnEnd: paragraph.columnEnd,
      };

      // Set parent reference
      llmElement.parentId = stateElement.id;

      // Add state element to workflow's children
      if (workflowNode && workflowNode.children) {
        workflowNode.children.push(stateElement);
        stateElement.parentId = workflowNode.id;
      }
    }
  }

  // Add non-paragraph, non-header nodes to workflow
  for (const node of rootLevelNodes) {
    if (
      node !== workflowNode &&
      node !== headerNode &&
      node.astSourceType === "element"
    ) {
      // Handle action elements that aren't already part of a state
      if (node.subType === ("action" as ElementSubType)) {
        // Check if it already has a state ancestor
        let hasStateAncestor = false;
        let currentParentId = node.parentId;

        // Find parent nodes recursively by their IDs
        const findParentNode = (
          parentId: string
        ): SerializedBaseElement | undefined => {
          // Check if the parent is the workflow node
          if (
            workflowNode &&
            workflowNode.attributes &&
            workflowNode.attributes.id === parentId
          ) {
            return workflowNode;
          }

          // Search through all nodes to find the one with matching ID
          for (const rootNode of rootLevelNodes) {
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

        let parentNode: SerializedBaseElement | undefined;
        while (currentParentId) {
          parentNode = findParentNode(currentParentId);
          if (!parentNode) break;

          if (parentNode.subType === ("state" as ElementSubType)) {
            hasStateAncestor = true;
            break;
          }
          currentParentId = parentNode.parentId;
        }

        if (!hasStateAncestor && workflowNode) {
          // Wrap action in a state
          const stateElement: SerializedBaseElement = {
            astSourceType: "element",
            type: "state" as ElementType,
            key: generateKey(),
            tag: "state",
            subType: "state" as ElementSubType,
            scope: [...(parentNode?.scope || ["root"]), `state-${node.key}`],
            attributes: {
              id: `state-${node.key}`,
            },
            children: [node],
            lineStart: node.lineStart,
            lineEnd: node.lineEnd,
            columnStart: node.columnStart,
            columnEnd: node.columnEnd,
          };

          // Set parent reference
          node.parentId = stateElement.id;

          // Add to workflow's children
          if (workflowNode.children) {
            workflowNode.children.push(stateElement);
            stateElement.parentId = workflowNode.id;
          }
        } else if (!node.parentId && workflowNode && workflowNode.children) {
          // Add directly to workflow if no parent
          workflowNode.children.push(node);
          node.parentId = workflowNode.id;
        }
      } else if (!node.parentId && workflowNode && workflowNode.children) {
        // Add non-action element directly to workflow if no parent
        workflowNode.children.push(node);
        node.parentId = workflowNode.id;
      }
    }
  }

  // Process header information
  if (
    headerNode &&
    headerNode.children &&
    workflowNode &&
    workflowNode.attributes
  ) {
    for (const field of headerNode.children) {
      if (
        field.astSourceType === "headerField" &&
        field.id &&
        field.value !== undefined
      ) {
        workflowNode.attributes[field.id] = field.value;
      }
    }
  }

  // Assign comments to elements
  if (comments.length > 0 && workflowNode) {
    assignCommentsToElement(workflowNode, comments);
  }

  // If this is an auto-created workflow, set the initial state to the first state element
  if (
    workflowNode &&
    workflowNode.children &&
    workflowNode.children.length > 0 &&
    workflowNode.attributes
  ) {
    const firstState = workflowNode.children.find(
      (child) => child.subType === ("state" as ElementSubType)
    );

    if (
      firstState &&
      firstState.attributes &&
      firstState.attributes.id &&
      !workflowNode.attributes.initial
    ) {
      workflowNode.attributes.initial = firstState.attributes.id;
    }
  }

  // Return the final array with the workflow as the main element
  return [workflowNode];
}

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

/**
 * Heal the workflow structure by ensuring final and error states exist,
 * and all states have proper transitions according to a set of rules.
 *
 * @param nodes Array of SerializedBaseElement nodes
 * @param diagnostics Array to collect diagnostics
 * @returns Healed nodes
 */
export function healFlowOrError(
  nodes: SerializedBaseElement[]
): SerializedBaseElement[] {
  // Get the workflow node (should be the first node after processFinalStructure)
  const workflowNode = nodes[0]?.tag === "workflow" ? nodes[0] : null;
  if (!workflowNode) {
    return nodes; // No workflow node found, return as is
  }

  // Check for final element and error state
  let hasFinalElement = false;
  let hasErrorState = false;
  let finalElement: SerializedBaseElement | undefined;
  let errorState: SerializedBaseElement | undefined;

  if (workflowNode.children) {
    // Check for existing final element and error state
    for (const child of workflowNode.children) {
      if (child.astSourceType === "element" && child.tag === "final") {
        hasFinalElement = true;
        finalElement = child;
      }
      if (
        child.astSourceType === "element" &&
        child.tag === "state" &&
        child.attributes &&
        child.attributes.id === "error"
      ) {
        hasErrorState = true;
        errorState = child;
      }
    }

    // Create final element if needed
    if (!hasFinalElement) {
      const newFinalElement: SerializedBaseElement = {
        astSourceType: "element",
        type: "state" as ElementType,
        key: generateKey(),
        tag: "final",
        subType: "output" as ElementSubType,
        scope: ["root", "final"],
        attributes: {
          id: "final",
        },
        children: [],
        lineStart: workflowNode.lineStart,
        lineEnd: workflowNode.lineEnd,
        columnStart: workflowNode.columnStart,
        columnEnd: workflowNode.columnEnd,
        parentId: workflowNode.attributes?.id as string,
      };
      workflowNode.children.push(newFinalElement);
      finalElement = newFinalElement;
    }

    // Create error state if needed
    if (!hasErrorState) {
      const newErrorState: SerializedBaseElement = {
        astSourceType: "element",
        type: "state" as ElementType,
        key: generateKey(),
        tag: "state",
        subType: "state" as ElementSubType,
        attributes: {
          id: "error",
        },
        scope: ["root", "error"],
        children: [],
        lineStart: workflowNode.lineStart,
        lineEnd: workflowNode.lineEnd,
        columnStart: workflowNode.columnStart,
        columnEnd: workflowNode.columnEnd,
        parentId: workflowNode.attributes?.id as string,
      };
      workflowNode.children.push(newErrorState);
      errorState = newErrorState;
    } else {
      console.log("Error state already exists");
    }

    // Find all direct child states of the workflow
    const directChildStates = workflowNode.children.filter(
      (child) =>
        child.astSourceType === "element" &&
        child.type === "state" &&
        child !== errorState
    );

    // Process all direct child states of the workflow
    // First, add transitions between siblings
    for (let i = 0; i < directChildStates.length - 1; i++) {
      const currentState = directChildStates[i];
      const nextState = directChildStates[i + 1];

      if (!hasConditionlessTransition(currentState)) {
        if (!currentState.children) {
          currentState.children = [];
        }

        // Add transition to next sibling
        currentState.children.push({
          astSourceType: "element",
          type: "action" as ElementType,
          key: generateKey(),
          tag: "transition",
          subType: "action" as ElementSubType,
          attributes: {
            target: nextState.attributes?.id,
          },
          scope: currentState.scope,
          children: [],
          lineStart: currentState.lineStart,
          lineEnd: currentState.lineEnd,
          columnStart: currentState.columnStart,
          columnEnd: currentState.columnEnd,
          parentId: currentState.attributes?.id as string,
        });
      }
    }

    // Then, add transition from last state to final
    if (directChildStates.length > 0) {
      const lastDirectChild = directChildStates[directChildStates.length - 1];
      if (!hasConditionlessTransition(lastDirectChild)) {
        // Add a direct transition to final
        if (!lastDirectChild.children) {
          lastDirectChild.children = [];
        }

        lastDirectChild.children.push({
          astSourceType: "element",
          type: "state" as ElementType,
          key: generateKey(),
          tag: "transition",
          subType: "action" as ElementSubType,
          attributes: {
            target: "final",
          },
          scope: lastDirectChild.scope,
          children: [],
          lineStart: lastDirectChild.lineStart,
          lineEnd: lastDirectChild.lineEnd,
          columnStart: lastDirectChild.columnStart,
          columnEnd: lastDirectChild.columnEnd,
          parentId: lastDirectChild.attributes?.id as string,
        });
      }
    }

    // Process states that already have conditional transitions but no conditionless ones
    for (const child of workflowNode.children) {
      if (
        child.astSourceType === "element" &&
        child.tag === "state" &&
        child.attributes?.id !== errorState?.attributes?.id
      ) {
        if (
          child.children?.some(
            (c) =>
              c.astSourceType === "element" &&
              c.tag === "transition" &&
              c.attributes?.cond
          ) &&
          !hasConditionlessTransition(child)
        ) {
          // Find next sibling or final
          let targetId: string | undefined = "final";

          const index = directChildStates.indexOf(child);
          if (index >= 0 && index < directChildStates.length - 1) {
            targetId = directChildStates[index + 1].attributes?.id as string;
          }

          if (targetId) {
            if (!child.children) {
              child.children = [];
            }

            // Add conditionless transition
            child.children.push({
              astSourceType: "element",
              type: "state" as ElementType,
              key: generateKey(),
              tag: "transition",
              subType: "action" as ElementSubType,
              attributes: {
                target: targetId,
              },
              scope: child.scope,
              children: [],
              lineStart: child.lineStart,
              lineEnd: child.lineEnd,
              columnStart: child.columnStart,
              columnEnd: child.columnEnd,
              parentId: child.attributes?.id as string,
            });
          }
        }
      }
    }

    // Now recursively process nested states
    for (const child of workflowNode.children) {
      if (
        child.astSourceType === "element" &&
        child.type === "state" &&
        child.subType !== "output" && // Use tag comparison instead of object reference
        child.attributes?.id !== "error" // Use id comparison for error state
      ) {
        processStateAndChildren(child, workflowNode, finalElement);
      }
    }
  }

  return nodes;
}

/**
 * Process a state and its children to add any required transitions
 */
function processStateAndChildren(
  state: SerializedBaseElement,
  workflow: SerializedBaseElement,
  finalElement: SerializedBaseElement | undefined
): void {
  if (!state.children) {
    state.children = [];
  }

  // Get all nested states within this state
  const nestedStates = state.children.filter(
    (child) => child.astSourceType === "element" && child.type === "state"
  );

  // Process all nested states first (depth-first)
  for (const nestedState of nestedStates) {
    processStateAndChildren(nestedState, workflow, finalElement);
  }

  // For each nested state, add transition to its next sibling if necessary
  for (let i = 0; i < nestedStates.length - 1; i++) {
    const currentState = nestedStates[i];
    const nextState = nestedStates[i + 1];

    if (!hasConditionlessTransition(currentState)) {
      if (!currentState.children) {
        currentState.children = [];
      }

      // Add transition to next sibling
      currentState.children.push({
        astSourceType: "element",
        type: "state" as ElementType,
        key: generateKey(),
        tag: "transition",
        subType: "action" as ElementSubType,
        attributes: {
          target: nextState.attributes?.id,
        },
        children: [],
        scope: currentState.scope,
        lineStart: currentState.lineStart,
        lineEnd: currentState.lineEnd,
        columnStart: currentState.columnStart,
        columnEnd: currentState.columnEnd,
        parentId: currentState.attributes?.id as string,
      });
    }
  }

  // For the last nested state, add transition to parent's next sibling or final
  if (nestedStates.length > 0) {
    const lastNestedState = nestedStates[nestedStates.length - 1];

    if (!hasConditionlessTransition(lastNestedState)) {
      // For nested states - we need special handling based on the test cases

      // 1. If parent has a next sibling at workflow level, use that
      const parent = findParentOf(workflow, state);
      let targetState = null;

      if (parent) {
        // Find parent's direct sibling
        const parentNextSibling = findNextSibling(parent, state);
        if (parentNextSibling) {
          targetState = parentNextSibling;
        } else {
          // If parent has no direct sibling but is a child of the workflow,
          // find the next workflow child after the parent
          const directWorkflowChildren = workflow.children?.filter(
            (child) =>
              child.astSourceType === "element" &&
              child.type === "state" &&
              child.attributes?.id !== "error" // Exclude error state
          );

          if (directWorkflowChildren && directWorkflowChildren.length > 0) {
            const parentIndex = directWorkflowChildren.indexOf(parent);
            if (
              parentIndex >= 0 &&
              parentIndex < directWorkflowChildren.length - 1
            ) {
              targetState = directWorkflowChildren[parentIndex + 1];
            }
          }
        }
      }

      // 2. Look for any next state after grandparent
      if (!targetState) {
        // For deeply nested case - find a direct transition to next workflow state
        const directWorkflowChildren = workflow.children?.filter(
          (child) =>
            child.astSourceType === "element" &&
            child.type === "state" &&
            child.attributes?.id !== "error" // Exclude error state
        );

        if (directWorkflowChildren && directWorkflowChildren.length > 0) {
          // Try to find the grandparent in the workflow children
          const stateAncestor = findAncestorInList(
            state,
            directWorkflowChildren
          );
          if (stateAncestor) {
            const ancestorIndex = directWorkflowChildren.indexOf(stateAncestor);
            if (
              ancestorIndex >= 0 &&
              ancestorIndex < directWorkflowChildren.length - 1
            ) {
              targetState = directWorkflowChildren[ancestorIndex + 1];
            }
          }
        }
      }

      // 3. Default to final state if no other target found
      if (!targetState && finalElement) {
        targetState = finalElement;
      }

      if (targetState && targetState.attributes?.id) {
        if (!lastNestedState.children) {
          lastNestedState.children = [];
        }

        // Add transition to target
        lastNestedState.children.push({
          astSourceType: "element",
          type: "state" as ElementType,
          key: generateKey(),
          tag: "transition",
          subType: "action" as ElementSubType,
          attributes: {
            target: targetState.attributes.id,
          },
          children: [],
          scope: lastNestedState.scope,
          lineStart: lastNestedState.lineStart,
          lineEnd: lastNestedState.lineEnd,
          columnStart: lastNestedState.columnStart,
          columnEnd: lastNestedState.columnEnd,
          parentId: lastNestedState.attributes?.id as string,
        });
      }
    }
  }
}

/**
 * Find the next target state by recursively walking up the parent chain
 */
export function findNextTargetState(
  state: SerializedBaseElement,
  parent: SerializedBaseElement,
  workflow: SerializedBaseElement,
  finalElement: SerializedBaseElement | undefined
): SerializedBaseElement | null {
  // Check if the state has a next sibling
  let nextSibling = findNextSibling(parent, state);

  // If there's a next sibling, return it
  if (nextSibling) {
    return nextSibling;
  }

  // If parent is the workflow and no next sibling, we should target the final state
  if (parent.subType === "user-input" && finalElement) {
    return finalElement;
  }

  // If no next sibling and parent is not the workflow, we need to look up the hierarchy
  // Find the parent's parent
  let grandparent: SerializedBaseElement | null = findParentOf(
    workflow,
    parent
  );

  // If we found a grandparent, continue the recursive search
  if (grandparent) {
    return findNextTargetState(parent, grandparent, workflow, finalElement);
  }

  // If we couldn't find a grandparent (shouldn't happen in a well-formed tree)
  // default to the final element
  return finalElement || null;
}

/**
 * Find the parent of a node in the tree
 */
export function findParentOf(
  root: SerializedBaseElement,
  target: SerializedBaseElement
): SerializedBaseElement | null {
  if (!root.children) return null;

  // Check if any child is the target
  for (const child of root.children) {
    if (child === target) {
      return root;
    }
  }

  // Recursively check children
  for (const child of root.children) {
    const result = findParentOf(child, target);
    if (result) return result;
  }

  return null;
}

/**
 * Find a state's next sibling (of subType "state")
 */
export function findNextSibling(
  parent: SerializedBaseElement,
  currentState: SerializedBaseElement
): SerializedBaseElement | null {
  if (!parent.children) return null;

  const stateChildren = parent.children.filter(
    (child) =>
      child.astSourceType === "element" &&
      child.type === "state" &&
      child.subType !== "output" && // Exclude final state from siblings
      child.attributes?.id !== "error" // Exclude error state from siblings
  );

  const currentIndex = stateChildren.findIndex(
    (state) => state === currentState
  );
  if (currentIndex === -1 || currentIndex === stateChildren.length - 1) {
    return null; // No next sibling
  }

  return stateChildren[currentIndex + 1];
}

/**
 * Check if a state has a conditionless transition
 */
export function hasConditionlessTransition(
  state: SerializedBaseElement
): boolean {
  if (!state.children) return false;

  return state.children.some(
    (child) =>
      child.astSourceType === "element" &&
      child.tag === "transition" &&
      (!child.attributes || !child.attributes.cond)
  );
}

/**
 * Find the first ancestor of state in the given list of potential ancestors
 */
function findAncestorInList(
  state: SerializedBaseElement,
  potentialAncestors: SerializedBaseElement[]
): SerializedBaseElement | null {
  // First check if state is directly in the list
  const directMatch = potentialAncestors.find((ancestor) => ancestor === state);
  if (directMatch) {
    return directMatch;
  }

  // Then check recursively for each potential ancestor
  for (const ancestor of potentialAncestors) {
    // Skip if ancestor doesn't have children
    if (!ancestor.children) continue;

    // Check if state is a direct child
    if (ancestor.children.includes(state)) {
      return ancestor;
    }

    // Check recursively (depth-first)
    for (const child of ancestor.children) {
      if (child.astSourceType === "element" && child.type === "state") {
        const result = isStateDescendantOf(state, child);
        if (result) {
          return ancestor;
        }
      }
    }
  }

  return null;
}

/**
 * Check if a state is a descendant of a potential ancestor
 */
function isStateDescendantOf(
  state: SerializedBaseElement,
  potentialAncestor: SerializedBaseElement
): boolean {
  // If no children, can't be an ancestor
  if (!potentialAncestor.children) return false;

  // Check if state is a direct child
  if (potentialAncestor.children.includes(state)) {
    return true;
  }

  // Check recursively (depth-first)
  for (const child of potentialAncestor.children) {
    if (child.astSourceType === "element" && child.type === "state") {
      if (isStateDescendantOf(state, child)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Make sure the addTransitionsRecursively function gets called for each workflow child
 * to ensure all states get proper transitions
 */
export function addAllTransitions(
  nodes: SerializedBaseElement[]
): SerializedBaseElement[] {
  const workflowNode = nodes[0];
  if (
    !workflowNode ||
    workflowNode.subType !== "user-input" ||
    !workflowNode.children
  ) {
    return nodes;
  }

  // Find the final element if it exists
  const finalElement = workflowNode.children.find(
    (child) => child.astSourceType === "element" && child.tag === "final"
  );

  // Process each state element recursively
  for (const child of workflowNode.children) {
    if (
      child.astSourceType === "element" &&
      child.type === "state" &&
      child.tag !== "final" &&
      child.attributes?.id !== "error"
    ) {
      addTransitionsRecursively(
        child,
        workflowNode,
        workflowNode,
        finalElement
      );
    }
  }

  return nodes;
}

/**
 * Recursively add transitions to states without conditionless transitions
 */
export function addTransitionsRecursively(
  state: SerializedBaseElement,
  parent: SerializedBaseElement,
  workflow: SerializedBaseElement,
  finalElement: SerializedBaseElement | undefined
): void {
  // Skip if not a state element
  if (state.astSourceType !== "element" || state.type !== "state") return;

  // Process children first (depth-first)
  if (state.children) {
    // Clone the array because we might add transitions during iteration
    const children = [...state.children];
    for (const child of children) {
      if (child.astSourceType === "element" && child.type === "state") {
        addTransitionsRecursively(child, state, workflow, finalElement);
      }
    }
  }

  // Check if this state needs a transition
  if (!hasConditionlessTransition(state)) {
    // Special case for direct workflow children is handled in healFlowOrError

    // For other cases (like nested states)
    // Find the target state by walking up the parent chain if necessary
    const targetState = findNextSibling(parent, state);

    if (targetState) {
      // If there's a next sibling, transition to it
      const transition: SerializedBaseElement = {
        astSourceType: "element",
        type: "state" as ElementType,
        key: generateKey(),
        tag: "transition",
        subType: "action" as ElementSubType,
        scope: state.scope,
        attributes: {
          target: targetState.attributes?.id as string,
        },
        children: [],
        lineStart: state.lineStart,
        lineEnd: state.lineEnd,
        columnStart: state.columnStart,
        columnEnd: state.columnEnd,
        parentId: state.attributes?.id as string,
      };

      if (!state.children) {
        state.children = [];
      }

      state.children.push(transition);
    } else {
      // No next sibling, use the regular target finding logic
      const target = findNextTargetState(state, parent, workflow, finalElement);

      // If we found a target, add a transition
      if (target && target.attributes && target.attributes.id) {
        const transition: SerializedBaseElement = {
          astSourceType: "element",
          type: "state" as ElementType,
          key: generateKey(),
          tag: "transition",
          subType: "action" as ElementSubType,
          scope: state.scope,
          attributes: {
            target: target.attributes.id,
          },
          children: [],
          lineStart: state.lineStart,
          lineEnd: state.lineEnd,
          columnStart: state.columnStart,
          columnEnd: state.columnEnd,
          parentId: state.attributes?.id as string,
        };

        if (!state.children) {
          state.children = [];
        }

        state.children.push(transition);
      }
    }
  }
}
