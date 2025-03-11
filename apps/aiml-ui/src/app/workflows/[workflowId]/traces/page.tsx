"use client";
import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { TraceProvider } from "@/domains/traces/context/trace-context";
import { WorkflowInformation } from "@/domains/workflows/workflow-information";
import { WorkflowTraces } from "@/domains/workflows/workflow-traces";
import { useWorkflow } from "@/hooks/use-workflows";

export default function WorkflowTracesPage(props: {
  params: Promise<{ workflowId: string }>;
}) {
  const params = use(props.params);
  const { name, isLoading: isWorkflowLoading } = useWorkflow(params.workflowId);

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
    <TraceProvider>
      <WorkflowTraces workflowId={params.workflowId} workflowName={name!} />
    </TraceProvider>
  );
}
