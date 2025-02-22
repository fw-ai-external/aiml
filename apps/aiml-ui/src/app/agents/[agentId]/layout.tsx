"use client";

import { AgentLayout } from "@/domains/agents/agent-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AgentLayout>{children}</AgentLayout>;
}
