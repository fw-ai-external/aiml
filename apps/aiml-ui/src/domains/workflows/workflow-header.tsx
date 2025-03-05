"use client";

import { useWorkflow } from "@/hooks/use-workflows";
import { usePathname, useRouter } from "next/navigation";

export function WorkflowHeader({ workflowId }: { workflowId: string }) {
  const { workflow } = useWorkflow(workflowId);
  const pathname = usePathname();
  const router = useRouter();

  const isGraphPage = pathname === `/workflows/${workflowId}/graph`;
  const isTracesPage = pathname === `/workflows/${workflowId}/traces`;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-medium">{workflow?.name}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/workflows/${workflowId}/graph`)}
            className={`px-3 py-1 rounded-md text-sm ${
              isGraphPage
                ? "bg-aiml-bg-4/70 text-aiml-el-1"
                : "hover:bg-aiml-bg-4/30 text-aiml-el-2"
            }`}
          >
            Graph
          </button>
          <button
            onClick={() => router.push(`/workflows/${workflowId}/traces`)}
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
