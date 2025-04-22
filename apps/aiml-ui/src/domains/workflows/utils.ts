import Dagre from "@dagrejs/dagre";
import type { StepCondition } from "@mastra/core/workflows";
import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type {
  RunStep,
  SerializedBaseElement,
  WorkflowGraph,
} from "@aiml/shared";

export type Condition = {
  ref: {
    step:
      | {
          id: string;
        }
      | "trigger";
    path: string;
  };
  query: Record<string, any>;
  conj?: "and" | "or";
};

export function extractConditions(group?: StepCondition<any, any>) {
  let result: Condition[] = [];
  if (!group) return result;

  function recurse(group: StepCondition<any, any>, conj?: "and" | "or") {
    const simpleCondition = Object.entries(group).find(([key]) =>
      key.includes(".")
    );
    if (simpleCondition) {
      const [key, queryValue] = simpleCondition;
      const [stepId, ...pathParts] = key.split(".");
      const ref = {
        step: {
          id: stepId,
        },
        path: pathParts.join("."),
      };
      result.push({
        ref,
        query: {
          [queryValue === true || queryValue === false ? "is" : "eq"]:
            String(queryValue),
        },
        conj,
      });
    }
    if ("ref" in group) {
      const { ref, query } = group;
      result.push({ ref, query, conj });
    }
    if ("and" in group) {
      for (const subGroup of group.and) {
        recurse({ ...subGroup }, "and");
      }
    }
    if ("or" in group) {
      for (const subGroup of group.or) {
        recurse({ ...subGroup }, "or");
      }
    }
  }

  recurse(group);
  return result;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB" });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      width: node.measured?.width ?? 274,
      height: node.measured?.height ?? 100,
    })
  );

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const position = g.node(node.id);
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      const x = position.x - (node.measured?.width ?? 274) / 2;
      const y = position.y - (node.measured?.height ?? 100) / 2;

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

const defaultEdgeOptions = {
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: "#8e8e8e",
  },
};

export const contructNodesAndEdges = ({
  executionGraph,
  elementTree,
  stepSubscriberGraph,
}: {
  executionGraph: WorkflowGraph;
  elementTree?: SerializedBaseElement;
  stepSubscriberGraph: any;
}) => {
  if (!executionGraph) {
    return { nodes: [], edges: [] };
  }

  let nodes: Node[] = [];
  let edges: Edge[] = [];
  const processedNodeIds = new Set<string>();

  // Process an ExecutionGraphStep and its children recursively
  const processGraphElement = (
    step: RunStep,
    parentId?: string,
    depth = 0,
    horizontalIndex = 0
  ): string => {
    // Avoid processing the same node twice
    if (processedNodeIds.has(step.key)) {
      // If we've already processed this node, just return the ID for edge creation
      return step.key;
    }

    processedNodeIds.add(step.key);

    // Create node for this element
    const nodeId = step.id;
    const nodeType = getNodeType(step);

    if (nodeType && step.type === "state") {
      const nodeLabel = getNodeLabel(step);

      // Base position - will be optimized by dagre later
      const position = {
        x: horizontalIndex * 300,
        y: depth * 150,
      };

      // Create the node
      const node: Node = {
        id: nodeId,
        position,
        type: nodeType,
        data: {
          label: nodeLabel,
          ...step,
          numKids: 1,
          children:
            findElementByKey(elementTree!, step.key)?.children?.map((child) => {
              return {
                ...child,
                status: step.status,
                duration: step.duration,
                label: undefined, // TODO: add label
              };
            }) ?? [],
          withoutTopHandle: step.subType === "user-input",
          withoutBottomHandle:
            step.subType === "error" || step.subType === "output",
        },
      };

      nodes.push(node);
    }

    // Process parallel elements
    if (step.runParallel) {
      step.steps.forEach((branch) => {
        branch.forEach((parallelStep) => {
          processGraphElement(parallelStep, nodeId, depth + 1, horizontalIndex);
        });
      });
    }

    return nodeId;
  };

  // Process the execution graph and add transition-to-state edges
  for (let i = 0; i < executionGraph.length; i++) {
    const currentStep = executionGraph[i];
    processGraphElement(currentStep);

    // Check if current step is a transition and next step is a state
    if (executionGraph[i + 1]?.type === "state") {
      const nextStep = executionGraph[i + 1];
      edges.push({
        id: `e${currentStep.scope[currentStep.scope.length - 1]}-${nextStep.id}`,
        source: currentStep.scope[currentStep.scope.length - 1],
        target: nextStep.id,
        ...defaultEdgeOptions,
        label: nextStep.when ? truncateCondition(nextStep.when) : undefined,
      });
    }
  }

  // Apply layout using Dagre
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    nodes,
    edges
  );

  return { nodes: layoutedNodes, edges: layoutedEdges };
};

// Helper to determine node type based on ExecutionGraphStep
function getNodeType(step: RunStep): string | null {
  if (step.subType === "error") return "default-node";
  if (step.subType === "user-input") return "incoming-request-node";
  if (step.subType === "output") return "default-node";
  if (step.type === "state") return "state-node";
  if (step.subType === "transition") return "transition-node";

  return null;
}

// Helper to determine label based on ExecutionGraphStep
function getNodeLabel(step: RunStep): string {
  if (step.attributes?.name) return step.attributes.name;
  if (step.attributes?.label) return step.attributes.label;
  return step.id;
}

// Helper to truncate conditions for edge labels
function truncateCondition(condition: string): string {
  return condition.length > 20 ? `${condition.substring(0, 20)}...` : condition;
}
function findElementByKey(
  elementTree: SerializedBaseElement,
  key: string
): SerializedBaseElement | undefined {
  if (!elementTree) return undefined;
  if (elementTree.key === key) return elementTree;
  if (elementTree.children) {
    for (const child of elementTree.children) {
      const found = findElementByKey(child, key);
      if (found) return found;
    }
  }

  return undefined;
}
