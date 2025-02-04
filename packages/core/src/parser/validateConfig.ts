import type { FireAgentNode } from "./types";

interface ValidationError {
  type: "unreachable_state";
  stateId: string;
  message: string;
}

export function validateConfig(config: FireAgentNode): {
  errors: ValidationError[];
  config: FireAgentNode;
} {
  return {
    errors: findUnreachableStates(config),
    config,
  };
}

function hasTagProperties(node: FireAgentNode): node is FireAgentNode & {
  kind: "tag";
  name: string;
  attributes: { [key: string]: string | number | undefined };
  nodes?: FireAgentNode[];
} {
  return (
    "kind" in node &&
    (node as any).kind === "tag" &&
    "name" in node &&
    "attributes" in node
  );
}

function findUnreachableStates(element: FireAgentNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const reachableStates = new Set<string>();

  // Helper function to collect all state IDs
  function collectStateIds(elem: FireAgentNode): Set<string> {
    const stateIds = new Set<string>();

    if (
      hasTagProperties(elem) &&
      elem.name === "state" &&
      elem.attributes?.id
    ) {
      stateIds.add(String(elem.attributes.id));
    }

    if (hasTagProperties(elem) && elem.nodes) {
      elem.nodes.forEach((child) => {
        const childStateIds = collectStateIds(child);
        childStateIds.forEach((id) => stateIds.add(id));
      });
    }

    return stateIds;
  }

  // Helper function to collect all transitions and mark initial states
  function collectTransitionsAndInitials(
    elem: FireAgentNode
  ): Map<string, string[]> {
    const transitions = new Map<string, string[]>();

    // Handle SCXML element
    if (hasTagProperties(elem) && elem.name === "scxml") {
      if (elem.attributes.initial) {
        reachableStates.add(String(elem.attributes.initial));
      } else if (elem.nodes && elem.nodes.length > 0) {
        // If no initial attribute, first state child is initial
        const firstState = elem.nodes.find(
          (child) =>
            hasTagProperties(child) &&
            child.name === "state" &&
            child.attributes?.id
        );
        if (
          firstState &&
          hasTagProperties(firstState) &&
          firstState.attributes.id
        ) {
          reachableStates.add(String(firstState.attributes.id));
        }
      }
    }

    // Handle state element
    if (hasTagProperties(elem) && elem.name === "state" && elem.attributes.id) {
      const stateId = String(elem.attributes.id);
      transitions.set(stateId, []);

      // Add initial state as reachable if specified
      if (elem.attributes.initial) {
        reachableStates.add(String(elem.attributes.initial));
      } else if (elem.nodes) {
        // If no initial attribute, first state child is initial
        const firstState = elem.nodes.find(
          (child) =>
            hasTagProperties(child) &&
            child.name === "state" &&
            child.attributes?.id
        );
        if (
          firstState &&
          hasTagProperties(firstState) &&
          firstState.attributes.id
        ) {
          reachableStates.add(String(firstState.attributes.id));
        }
      }
    }

    if (
      hasTagProperties(elem) &&
      elem.name === "transition" &&
      elem.attributes.target
    ) {
      const parentState = findParentState(elem);
      if (
        parentState &&
        hasTagProperties(parentState) &&
        parentState.attributes?.id
      ) {
        const targets =
          transitions.get(String(parentState.attributes.id)) || [];
        targets.push(String(elem.attributes.target));
        transitions.set(String(parentState.attributes.id), targets);
      }
    }

    if (hasTagProperties(elem) && elem.nodes) {
      elem.nodes.forEach((child) => {
        const childTransitions = collectTransitionsAndInitials(child);
        childTransitions.forEach((targets, source) => {
          const existing = transitions.get(source) || [];
          transitions.set(source, [...existing, ...targets]);
        });
      });
    }

    return transitions;
  }

  function findParentState(elem: FireAgentNode): FireAgentNode | null {
    let current = elem;
    while (current && hasTagProperties(current) && current.name !== "state") {
      current = findParent(current);
    }
    return current || null;
  }

  function findParent(elem: FireAgentNode): FireAgentNode {
    let queue = [element];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (
        hasTagProperties(elem) &&
        hasTagProperties(current) &&
        current.nodes?.includes(elem)
      ) {
        return current;
      }
      if (hasTagProperties(current) && current.nodes) {
        queue.push(...current.nodes);
      }
    }
    return element;
  }

  // Collect all states and transitions, and mark initial states
  const allStates = collectStateIds(element);
  const transitions = collectTransitionsAndInitials(element);

  // Find reachable states through transitions
  let changed = true;
  while (changed) {
    changed = false;
    transitions.forEach((targets, source) => {
      if (reachableStates.has(source)) {
        targets.forEach((target) => {
          if (!reachableStates.has(target)) {
            reachableStates.add(target);
            changed = true;
          }
        });
      }
    });
  }

  // Find unreachable states
  allStates.forEach((stateId) => {
    if (!reachableStates.has(stateId)) {
      errors.push({
        type: "unreachable_state",
        stateId,
        message: `State "${stateId}" is unreachable: no Transition elements or \`initial\` props lead to this state`,
      });
    }
  });

  return errors;
}
