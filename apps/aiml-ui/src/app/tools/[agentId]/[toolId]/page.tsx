"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/ui/header";
import { Skeleton } from "@/components/ui/skeleton";

import { useAgent } from "@/hooks/use-agents";

export default function AgentToolPage({
  params,
}: {
  params: Promise<{ agentId: string; toolId: string }>;
}) {
  const resolvedParams = React.use(params);
  const { agent, isLoading } = useAgent(resolvedParams.agentId);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full">
        <Header title="Tool" />
        <div className="p-4">
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  const tool = agent?.tools?.[resolvedParams.toolId];

  if (!tool) {
    router.push("/tools");
    return null;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <Header title={"tool"} />
      <div className="p-4">
        <p className="text-aiml-el-2">{tool.description}</p>
      </div>
    </div>
  );
}
