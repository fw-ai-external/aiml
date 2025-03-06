"use client";
import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import WorkflowGraph from "@/domains/workflows/workflow-graph";
import { WorkflowInformation } from "@/domains/workflows/workflow-information";
import { useWorkflow } from "@/hooks/use-workflows";

export default function WorkflowGraphPage(props: {
  params: Promise<{ workflowId: string }>;
}) {
  const params = use(props.params);
  const {
    stepGraph,
    stepSubscriberGraph,
    isLoading: isWorkflowLoading,
  } = useWorkflow(params.workflowId);

  return (
    <main className="flex-1 relative grid grid-cols-[1fr_400px] divide-x">
      {!stepGraph && isWorkflowLoading ? (
        <div className="p-4">
          <Skeleton className="h-[600px]" />
        </div>
      ) : (
        <WorkflowGraph
          stepSubscriberGraph={stepSubscriberGraph}
          stepGraph={stepGraph}
          workflowId={params.workflowId}
        />
      )}
      <div className="flex flex-col">
        <WorkflowInformation workflowId={params.workflowId} />
      </div>
    </main>
  );
}
