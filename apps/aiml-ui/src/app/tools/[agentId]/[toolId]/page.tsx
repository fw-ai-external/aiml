"use client";

import { useRouter } from "next/navigation";

import { Header } from "@/components/ui/header";
import { Skeleton } from "@/components/ui/skeleton";

import { useAgent } from "@/hooks/use-agents";

export default function AgentToolPage({
  params,
}: {
  params: { agentId: string; toolId: string };
}) {
  const { agent, isLoading } = useAgent(params.agentId);
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

  const tool = agent?.tools?.[params.toolId];

  if (!tool) {
    router.push("/tools");
    return null;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <Header title={tool.name} />
      <div className="p-4">
        <p className="text-aiml-el-2">{tool.description}</p>
      </div>
    </div>
  );
}
