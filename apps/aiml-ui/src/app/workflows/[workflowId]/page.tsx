'use client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';
import WorkflowGraph from '@/domains/workflows/workflow-graph';
import { WorkflowInformation } from '@/domains/workflows/workflow-information';
import { useWorkflow } from '@/hooks/use-workflows';
import { AssistantRuntimeProvider, type ChatModelAdapter, useLocalRuntime } from '@assistant-ui/react';
import type { OpenAIChatCompletionChunk } from '@fireworks/shared';
import { use } from 'react';

const AIMLOpenAIChatRuntime = ({
  workflowId,
}: {
  workflowId: string;
}): ChatModelAdapter => ({
  async *run({ messages, abortSignal, context }) {
    console.log('==*** calling with messages', messages);
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, workflowId, context }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader');
    }
    let delta = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const text = new TextDecoder().decode(value);
      const events: OpenAIChatCompletionChunk[] = text
        .replaceAll('[data]', '')
        .replaceAll('[done]', '')
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => {
          try {
            return JSON.parse(line.trim());
          } catch (error) {
            console.error('Error parsing line', line, error);
            return null;
          }
        })
        .filter((event) => event !== null);

      for (const event of events) {
        delta += event.choices[0]?.delta?.content || '';
      }
      yield {
        content: [{ type: 'text', text: delta }],
      };
    }
  },
});

export default function WorkflowGraphPage(props: {
  params: Promise<{ workflowId: string }>;
}) {
  const params = use(props.params);
  const { stepGraph, stepSubscriberGraph, isLoading: isWorkflowLoading } = useWorkflow(params.workflowId);
  const runtime = useLocalRuntime(
    AIMLOpenAIChatRuntime({
      workflowId: params.workflowId,
    }),
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
            <WorkflowInformation key={`workflowInformation-${params.workflowId}`} workflowId={params.workflowId} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </AssistantRuntimeProvider>
  );
}
