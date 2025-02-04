"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Header } from "@/components/ui/header";
import { Skeleton } from "@/components/ui/skeleton";

import WorkflowGraph from "@/domains/workflows/workflow-graph";
import { WorkflowInformation } from "@/domains/workflows/workflow-information";
import { useWorkflow } from "@/hooks/use-workflows";
import { Slash } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";

function WorkflowClient({
  workflowId,
  runId,
}: {
  workflowId: string;
  runId?: string;
}) {
  const { workflow, isLoading: isWorkflowLoading } = useWorkflow(workflowId);
  console.log(workflow, isWorkflowLoading);
  if (isWorkflowLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title={<Skeleton className="h-6 w-[200px]" />} />
        <main className="flex-1 relative grid grid-cols-[1fr_400px] divide-x">
          <div className="p-4">
            <Skeleton className="h-[600px]" />
          </div>
          <div className="flex flex-col">
            {runId && (
              <WorkflowInformation workflowId={workflowId} runId={runId} />
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[100vh]">
      <Header
        title={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/workflows">Workflows</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <Slash />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{workflow?.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <main className="flex-1 relative grid grid-cols-[1fr_400px] divide-x w-full min-h-screen">
        <WorkflowGraph workflow={workflow!} />
        <div className="flex flex-col">
          {runId && (
            <WorkflowInformation workflowId={workflowId} runId={runId} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  const { workflowId } = useParams();
  const searchParams = useSearchParams();

  return (
    <WorkflowClient
      workflowId={workflowId as string}
      runId={searchParams.get("runId") as string | undefined}
    />
  );
}
