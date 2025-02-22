"use client";

import { Header } from "@/components/ui/header";
import { Skeleton } from "@/components/ui/skeleton";

import { useWorkflow } from "@/hooks/use-workflows";
import { WorkflowHeader } from "@/domains/workflows/workflow-header";

export default function WorkflowLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workflowId: string };
}) {
  const { workflow, isLoading: isWorkflowLoading } = useWorkflow(
    params.workflowId
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isWorkflowLoading ? (
        <Header title={<Skeleton className="h-6 w-[200px]" />} />
      ) : (
        <WorkflowHeader
          workflowName={workflow?.name!}
          workflowId={params.workflowId}
        />
      )}
      {children}
    </div>
  );
}
