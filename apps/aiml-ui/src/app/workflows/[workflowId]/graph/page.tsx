"use client";

import { Skeleton } from "@/components/ui/skeleton";

import WorkflowGraph from "@/domains/workflows/workflow-graph";
import { WorkflowInformation } from "@/domains/workflows/workflow-information";
import { useWorkflow } from "@/hooks/use-workflows";

export default function WorkflowGraphPage({
  params,
}: {
  params: { workflowId: string };
}) {
  const { workflow, isLoading: isWorkflowLoading } = useWorkflow(
    params.workflowId
  );

  console.log("workflow", workflow);

  if (isWorkflowLoading) {
    return (
      <main className="flex-1 relative grid grid-cols-[1fr_400px] divide-x">
        <div className="p-4">
          <Skeleton className="h-[600px]" />
        </div>
        <div className="flex flex-col">
          <WorkflowInformation workflowId={params.workflowId} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 relative grid grid-cols-[1fr_400px] divide-x">
      <WorkflowGraph workflow={workflow!} />
      <div className="flex flex-col">
        <WorkflowInformation workflowId={params.workflowId} />
      </div>
    </main>
  );
}
