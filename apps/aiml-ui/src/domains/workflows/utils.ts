import Dagre from "@dagrejs/dagre";
import type { StepCondition } from "@mastra/core/workflows";
import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { ExecutionGraphElement } from "@fireworks/shared";

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

export const pathAlphabet = "abcdefghijklmnopqrstuvwxyz"
  .toUpperCase()
  .split("");

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
  stepGraph,
}: {
  stepGraph: ExecutionGraphElement;
  stepSubscriberGraph?: any;
}) => {
  if (!stepGraph) {
    return { nodes: [], edges: [] };
  }

  let nodes: Node[] = [];
  let edges: Edge[] = [];
  const processedNodeIds = new Set<string>();

  // Process an ExecutionGraphElement and its children recursively
  const processGraphElement = (
    element: ExecutionGraphElement,
    parentId?: string,
    depth = 0,
    horizontalIndex = 0
  ): string => {
    // Avoid processing the same node twice
    if (processedNodeIds.has(element.id)) {
      // If we've already processed this node, just return the ID for edge creation
      return element.id;
    }

    processedNodeIds.add(element.id);

    // Create node for this element
    const nodeId = element.id;
    const nodeType = getNodeType(element);
    if (nodeType) {
      const nodeLabel = getNodeLabel(element);

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
          ...element,
          withoutTopHandle: !parentId,
          withoutBottomHandle:
            !element.next?.length && !element.parallel?.length,
        },
      };

      nodes.push(node);
    }
    // Create edge from parent to this node if there is a parent
    if (parentId) {
      edges.push({
        id: `e${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        ...defaultEdgeOptions,
        // If there's a condition, add it to the edge label
        label: element.when ? truncateCondition(element.when) : undefined,
      });
    }
    console.log("edges", edges);

    // Process next elements sequentially
    if (element.next?.length) {
      let currentParentId =
        element.type === "action"
          ? element.scope[element.scope.length - 1]
          : nodeId;

      element.next.forEach((nextElement, i) => {
        const nextId = processGraphElement(
          nextElement,
          currentParentId,
          depth + 1,
          horizontalIndex + i
        );
        currentParentId = nextId;
      });
    }

    // Process parallel elements
    if (element.parallel?.length) {
      element.parallel.forEach((parallelElement) => {
        processGraphElement(
          parallelElement,
          nodeId,
          depth + 1,
          horizontalIndex
        );
      });
    }

    return nodeId;
  };

  // Start processing from the root element
  processGraphElement(stepGraph);

  // Apply layout using Dagre
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    nodes,
    edges
  );

  return { nodes: layoutedNodes, edges: layoutedEdges };
};

// Helper to determine node type based on ExecutionGraphElement
function getNodeType(element: ExecutionGraphElement): string | null {
  if (element.type === "state") return "state-node";
  if (element.type === "error") return "default-node";
  if (element.type === "user-input") return "incoming-request-node";
  if (element.type === "output") return "default-node";

  return null;
}

// Helper to determine label based on ExecutionGraphElement
function getNodeLabel(element: ExecutionGraphElement): string {
  if (element.attributes?.name) return element.attributes.name;
  if (element.attributes?.label) return element.attributes.label;
  return element.id;
}

// Helper to truncate conditions for edge labels
function truncateCondition(condition: string): string {
  return condition.length > 20 ? `${condition.substring(0, 20)}...` : condition;
}
