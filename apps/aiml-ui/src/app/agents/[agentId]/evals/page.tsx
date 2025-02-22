"use client";

import { AgentEvals } from "@/domains/agents/agent-evals";

export default function AgentEvalsPage({
  params,
}: {
  params: { agentId: string };
}) {
  return (
    <main className="min-h-0">
      <AgentEvals agentId={params.agentId} />
    </main>
  );
}
