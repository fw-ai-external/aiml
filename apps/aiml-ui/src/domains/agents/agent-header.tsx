"use client";

import { usePathname, useRouter } from "next/navigation";

export function AgentHeader({
  agentName,
  agentId,
}: {
  agentName: string;
  agentId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isEvalsPage = pathname === `/agents/${agentId}/evals`;
  const isChatPage = pathname.startsWith(`/agents/${agentId}/chat`);
  const isTracesPage = pathname === `/agents/${agentId}/traces`;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-medium">{agentName}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/agents/${agentId}/chat`)}
            className={`px-3 py-1 rounded-md text-sm ${
              isChatPage
                ? "bg-aiml-bg-4/70 text-aiml-el-1"
                : "hover:bg-aiml-bg-4/30 text-aiml-el-2"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => router.push(`/agents/${agentId}/evals`)}
            className={`px-3 py-1 rounded-md text-sm ${
              isEvalsPage
                ? "bg-aiml-bg-4/70 text-aiml-el-1"
                : "hover:bg-aiml-bg-4/30 text-aiml-el-2"
            }`}
          >
            Evals
          </button>
          <button
            onClick={() => router.push(`/agents/${agentId}/traces`)}
            className={`px-3 py-1 rounded-md text-sm ${
              isTracesPage
                ? "bg-aiml-bg-4/70 text-aiml-el-1"
                : "hover:bg-aiml-bg-4/30 text-aiml-el-2"
            }`}
          >
            Traces
          </button>
        </div>
      </div>
    </div>
  );
}
