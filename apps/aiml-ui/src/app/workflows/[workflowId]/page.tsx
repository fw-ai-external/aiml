"use client";
import { use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import WorkflowGraph from "@/domains/workflows/workflow-graph";
import { WorkflowInformation } from "@/domains/workflows/workflow-information";
import { useWorkflow } from "@/hooks/use-workflows";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

export default function WorkflowGraphPage(props: {
  params: Promise<{ workflowId: string }>;
}) {
  const params = use(props.params);
  const {
    stepGraph,
    stepSubscriberGraph,
    isLoading: isWorkflowLoading,
  } = useWorkflow(params.workflowId);
  const runtime = useChatRuntime({
    api: "/api/chat",
    body: {
      workflowId: params.workflowId,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={70}>
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
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={30}>
          <div className="flex flex-col">
            <WorkflowInformation workflowId={params.workflowId} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </AssistantRuntimeProvider>
  );
}
