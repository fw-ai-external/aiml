"use client";

import * as React from "react";

import { AgentEvals } from "@/domains/agents/agent-evals";

export default function AgentEvalsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = React.use(params);
  return (
    <main className="min-h-0">
      <AgentEvals agentId={resolvedParams.agentId} />
    </main>
  );
}
