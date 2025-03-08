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
import { WorkflowStateNode } from "@/domains/workflows/workflow-state-node";

function WorkflowGraph({
  stepSubscriberGraph,
  stepGraph,
  workflowId,
}: {
  stepSubscriberGraph: any;
  stepGraph: any;
  workflowId: string;
}) {
  const { nodes: initialNodes, edges: initialEdges } = contructNodesAndEdges({
    stepGraph,
    stepSubscriberGraph,
  });

  const nodeTypes = {
    "default-node": WorkflowDefaultNode,
    "condition-node": WorkflowConditionNode,
    "state-node": WorkflowStateNode,
  };
  return (
    <div className="w-full h-full">
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
