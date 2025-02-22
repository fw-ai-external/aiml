"use client";

import { PanelLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Chat } from "@/components/Chat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

import { AgentInformation } from "@/domains/agents/agent-information";
import { AgentSidebar } from "@/domains/agents/agent-sidebar";
import { useAgent } from "@/hooks/use-agents";
import { useMemory, useMessages } from "@/hooks/use-memory";
import type { Message } from "@/types";

export default function AgentChat({
  params,
}: {
  params: { agentId: string; threadId?: string[] };
}) {
  const router = useRouter();
  const threadId = params.threadId?.[0];
  const { agent, isLoading: isAgentLoading } = useAgent(params.agentId);
  const { memory } = useMemory(params.agentId);
  const { messages, isLoading: isMessagesLoading } = useMessages({
    agentId: params.agentId,
    threadId: threadId!,
    memory: !!memory?.result,
  });
  const [sidebar, setSidebar] = useState(true);

  useEffect(() => {
    if (memory?.result && !threadId) {
      router.push(`/agents/${params.agentId}/chat/${crypto.randomUUID()}`);
    }
  }, [memory?.result, threadId, params.agentId, router]);

  if (isAgentLoading) {
    return (
      <main className="flex-1 relative grid grid-cols-[1fr_400px] divide-x">
        <div className="p-4">
          <Skeleton className="h-[600px]" />
        </div>
        <div className="flex flex-col">
          <AgentInformation agentId={params.agentId} />
        </div>
      </main>
    );
  }

  return (
    <main
      className={cn(
        "flex-1 relative grid divide-x",
        sidebar && memory?.result
          ? "grid-cols-[256px_1fr_400px] overflow-y-hidden h-full"
          : "grid-cols-[1fr_400px]"
      )}
    >
      {sidebar && memory?.result ? (
        <AgentSidebar agentId={params.agentId} threadId={threadId!} />
      ) : null}
      <div className="relative">
        {memory?.result ? (
          <Button
            variant="primary"
            size="icon"
            className="absolute top-4 left-4 z-50"
            onClick={() => setSidebar(!sidebar)}
          >
            <PanelLeft />
          </Button>
        ) : null}
        <Chat
          agentId={params.agentId}
          agentName={agent?.name}
          threadId={threadId!}
          initialMessages={
            isMessagesLoading ? undefined : (messages as Message[])
          }
          memory={memory?.result}
        />
      </div>
      <div className="flex flex-col">
        <AgentInformation agentId={params.agentId} />
      </div>
    </main>
  );
}
