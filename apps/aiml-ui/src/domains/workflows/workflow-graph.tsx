import type { Workflow } from "@mastra/core/workflows";
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { contructNodesAndEdges } from "./utils";
import { WorkflowConditionNode } from "./workflow-condition-node";
import { WorkflowDefaultNode } from "./workflow-default-node";

function WorkflowGraph({ workflow }: { workflow: Workflow }) {
  console.log("workflow graph render");
  const { nodes: initialNodes, edges: initialEdges } = contructNodesAndEdges({
    stepGraph: workflow.stepGraph,
    stepSubscriberGraph: workflow.stepSubscriberGraph,
  });

  const nodeTypes = {
    "default-node": WorkflowDefaultNode,
    "condition-node": WorkflowConditionNode,
  };
  return (
    <div className="w-full h-full">
      <ReactFlow
        key={`workflow-${workflow.name}`}
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
