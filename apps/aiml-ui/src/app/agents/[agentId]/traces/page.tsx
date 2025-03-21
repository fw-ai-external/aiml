'use client';

import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import { AgentInformation } from '@/domains/agents/agent-information';
import { AgentTraces } from '@/domains/agents/agent-traces';
import { TraceProvider } from '@/domains/traces/context/trace-context';
import { useAgent } from '@/hooks/use-agents';

export default function AgentTracesPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = React.use(params);
  const { agent, isLoading: isAgentLoading } = useAgent(resolvedParams.agentId);

  if (isAgentLoading) {
    return (
      <main className="flex-1 relative grid grid-cols-[1fr_400px] divide-x">
        <div className="p-4">
          <Skeleton className="h-[600px]" />
        </div>
        <div className="flex flex-col">
          <AgentInformation agentId={resolvedParams.agentId} />
        </div>
      </main>
    );
  }

  return (
    <TraceProvider>
      <AgentTraces agentId={resolvedParams.agentId} agentName={agent?.name!} />
    </TraceProvider>
  );
}
