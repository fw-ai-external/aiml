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
import {
  AssistantRuntimeProvider,
  ChatModelAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";

const AIMLRuntime = ({
  workflowId,
}: {
  workflowId: string;
}): ChatModelAdapter => ({
  async *run({ messages, abortSignal, context }) {
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages, workflowId, context }),
    });
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No reader");
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const text = new TextDecoder().decode(value);
      yield { content: [{ type: "text", text }] };
    }
  },
});

export default function WorkflowGraphPage(props: {
  params: Promise<{ workflowId: string }>;
}) {
  const params = use(props.params);
  const {
    stepGraph,
    stepSubscriberGraph,
    isLoading: isWorkflowLoading,
  } = useWorkflow(params.workflowId);
  const runtime = useLocalRuntime(
    AIMLRuntime({
      workflowId: params.workflowId,
    })
  );

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
            <WorkflowInformation
              key={`workflowInformation-${params.workflowId}`}
              workflowId={params.workflowId}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </AssistantRuntimeProvider>
  );
}
