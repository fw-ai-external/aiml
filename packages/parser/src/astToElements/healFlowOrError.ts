import type {
  SerializedBaseElement,
  ElementType,
  ElementSubType,
} from "@aiml/shared";
import { generateKey } from "../utils/helpers.js";

/**
 * Heal the workflow structure by ensuring final and error states exist,
 * and all states have proper transitions according to a set of rules.
 *
 * @param nodes Array of SerializedBaseElement nodes
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

    // Find any non-state elements directly under workflow and wrap them in states
    const nonStateElements = workflowNode.children.filter(
      (child) =>
        child.astSourceType === "element" &&
        child.type !== "state" &&
        child.type !== "param" // Skip datamodel elements
    );

    // Process each non-state element
    for (let i = 0; i < nonStateElements.length; i++) {
      const element = nonStateElements[i];
      const elementIndex = workflowNode.children.indexOf(element);

      if (elementIndex !== -1) {
        // Create a wrapper state
        const wrapperState: SerializedBaseElement = {
          astSourceType: "element",
          type: "state" as ElementType,
          key: generateKey(),
          tag: "state",
          subType: "state" as ElementSubType,
          attributes: {
            id: `auto_wrapping_state_${generateKey()}`,
          },
          scope: ["root", `auto_wrapping_state_${i}`],
          children: [element], // Add the non-state element as a child
          lineStart: element.lineStart,
          lineEnd: element.lineEnd,
          columnStart: element.columnStart,
          columnEnd: element.columnEnd,
          parentId: workflowNode.attributes?.id as string,
        };

        // Update the element's parentId
        element.parentId = wrapperState.attributes?.id as string;

        // Replace the element with the wrapper state in the workflow
        workflowNode.children[elementIndex] = wrapperState;
      }
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

  // Sort children in workflow node to ensure proper order:
  // 1. Params first
  // 2. Regular states (not error or output)
  // 3. Output states (final)
  // 4. Error state last
  if (workflowNode && workflowNode.children) {
    workflowNode.children.sort((a, b) => {
      // Params come first
      if (a.tag === "param" && b.tag !== "param") return -1;
      if (a.tag !== "param" && b.tag === "param") return 1;

      // Error state comes last
      if (a.attributes?.id === "error") return 1;
      if (b.attributes?.id === "error") return -1;

      // Final/output states come second to last
      if (a.tag === "final" || a.subType === "output") {
        if (b.attributes?.id === "error") return -1;
        return 1;
      }
      if (b.tag === "final" || b.subType === "output") {
        if (a.attributes?.id === "error") return 1;
        return -1;
      }

      // Regular states maintain their order
      return 0;
    });
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
    workflowNode.subType !== "human-input" ||
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
