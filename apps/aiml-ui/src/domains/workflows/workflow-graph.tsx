import {
  Background,
  BackgroundVariant,
  type OnNodesChange,
  ReactFlow,
  applyNodeChanges,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { contructNodesAndEdges } from "./utils";
import { WorkflowDefaultNode } from "./nodes/default";
import { ChevronRight } from "lucide-react";
import { StateNode } from "@/domains/workflows/nodes/state-node";
import React, { useCallback, useEffect, useState } from "react";
import type { SerializedBaseElement, WorkflowGraph } from "@fireworks/shared";
import { IncomingRequestNode } from "@/domains/workflows/nodes/IncomingRequest";

export interface BreadcrumbItem {
  label: string;
  onClick: () => void;
}

function WorkflowGraph({
  stepSubscriberGraph,
  executionGraph,
  workflowId,
  elementTree,
  parentStateId,
}: {
  stepSubscriberGraph: any;
  executionGraph: WorkflowGraph;
  workflowId: string;
  elementTree?: SerializedBaseElement;
  parentStateId?: string;
}) {
  const { nodes: initialNodes, edges: initialEdges } = contructNodesAndEdges({
    executionGraph,
    stepSubscriberGraph,
    elementTree,
  });
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  useEffect(() => {
    if (nodes.length !== initialNodes.length) {
      setNodes(initialNodes);
    }
    if (edges.length !== initialEdges.length) {
      setEdges(initialEdges);
    }
  }, [nodes, edges, initialNodes, initialEdges]);

  const breadcrumbItems = [{ label: "Main Flow", onClick: () => {} }];

  const nodeTypes = React.useMemo(
    () => ({
      "state-node": (props: any) => <StateNode {...props} />,
      "default-node": WorkflowDefaultNode,
      "incoming-request-node": IncomingRequestNode,
    }),
    []
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  return (
    <div className="w-full h-full nokey">
      <nav className="flex px-4 py-2 border-b" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          {breadcrumbItems.map((item, index) => (
            <li key={index} className="inline-flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
              )}
              <button
                onClick={item.onClick}
                className="inline-flex items-center text-sm font-medium text-gray-300 hover:text-white"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <ReactFlow
        key={`workflow-${workflowId}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{
          maxZoom: 0.85,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={0.5} />
      </ReactFlow>
    </div>
  );
}

export default WorkflowGraph;
