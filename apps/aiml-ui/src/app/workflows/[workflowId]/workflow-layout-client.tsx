"use client";

import * as React from "react";
import { Header } from "@/components/ui/header";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkflow } from "@/hooks/use-workflows";
import { WorkflowHeader } from "@/domains/workflows/workflow-header";

export function WorkflowLayoutClient({
  workflowId,
  children,
}: {
  workflowId: string;
  children: React.ReactNode;
}) {
  const { workflow, isLoading: isWorkflowLoading } = useWorkflow(workflowId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isWorkflowLoading ? (
        <Header title={<Skeleton className="h-6 w-[200px]" />} />
      ) : (
        <WorkflowHeader
          workflowName={workflow?.name!}
          workflowId={workflowId}
        />
      )}
      {children}
    </div>
  );
}
