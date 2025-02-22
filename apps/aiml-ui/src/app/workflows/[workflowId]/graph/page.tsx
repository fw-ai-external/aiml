"use client";

import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";

import WorkflowGraph from "@/domains/workflows/workflow-graph";
import { WorkflowInformation } from "@/domains/workflows/workflow-information";
import { useWorkflow } from "@/hooks/use-workflows";

export default function WorkflowGraphPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const resolvedParams = React.use(params);
  const { workflow, isLoading: isWorkflowLoading } = useWorkflow(
    resolvedParams.workflowId
  );

  if (isWorkflowLoading) {
    return (
      <main className="flex-1 relative grid grid-cols-[1fr_400px] divide-x">
        <div className="p-4">
          <Skeleton className="h-[600px]" />
        </div>
        <div className="flex flex-col">
          <WorkflowInformation workflowId={resolvedParams.workflowId} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 relative grid grid-cols-[1fr_400px] divide-x">
      <WorkflowGraph workflow={workflow!} />
      <div className="flex flex-col">
        <WorkflowInformation workflowId={resolvedParams.workflowId} />
      </div>
    </main>
  );
}
