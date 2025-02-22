"use client";

import * as React from "react";

import { AgentLayout } from "@/domains/agents/agent-layout";

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const resolvedParams = React.use(params);
  return <AgentLayout agentId={resolvedParams.agentId}>{children}</AgentLayout>;
}
