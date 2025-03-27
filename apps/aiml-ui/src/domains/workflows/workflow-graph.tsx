import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { contructNodesAndEdges } from "./utils";
import { WorkflowDefaultNode } from "./workflow-default-node";
import { ChevronRight } from "lucide-react";
import { StateNode } from "@/domains/workflows/nodes/state-node";
import React from "react";
import type { ExecutionGraphElement } from "@fireworks/shared";

export interface BreadcrumbItem {
  label: string;
  onClick: () => void;
}

function WorkflowGraph({
  stepSubscriberGraph,
  stepGraph,
  workflowId,
  parentStateId,
}: {
  stepSubscriberGraph: any;
  stepGraph: ExecutionGraphElement;
  workflowId: string;
  parentStateId?: string;
}) {
  const { nodes: initialNodes, edges: initialEdges } = contructNodesAndEdges({
    stepGraph,
    stepSubscriberGraph,
  });

  const breadcrumbItems = [{ label: "Main Flow", onClick: () => {} }];

  const nodeTypes = React.useMemo(
    () => ({
      "state-node": (props: any) => <StateNode {...props} />,
      "default-node": WorkflowDefaultNode,
    }),
    []
  );

  return (
    <div className="w-full h-full">
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
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        // onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{
          maxZoom: 0.85,
        }}
      >
        <MiniMap
          pannable
          zoomable
          maskColor="#121212"
          bgColor="#171717"
          nodeColor="#2c2c2c"
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={0.5} />
      </ReactFlow>
    </div>
  );
}

export default WorkflowGraph;
