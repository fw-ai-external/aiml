import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkflow } from "@/hooks/use-workflows";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const CodeEditor = dynamic(
  () => import("@/components/ide").then((mod) => mod.CodeEditor),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
        <p className="text-gray-300/60">Loading editor...</p>
      </div>
    ),
    ssr: false,
  }
);

export function WorkflowPrompt({ workflowId }: { workflowId: string }) {
  const {
    prompt: workflowPrompt,
    astNodes,
    astDiagnostics,
    isLoading: isWorkflowLoading,
    updatePrompt,
    isUpdating,
  } = useWorkflow(workflowId);
  const [prompt, setPrompt] = useState(workflowPrompt || null);

  const [isClientSide, setIsClientSide] = useState(false);

  useEffect(() => {
    if (!prompt && workflowPrompt) {
      setPrompt(workflowPrompt);
    }
    if (prompt !== workflowPrompt) {
      updatePrompt(prompt || "").catch((error) => {
        console.error("Error updating workflow prompt", error);
      });
    }
  }, [prompt, workflowPrompt]);

  useEffect(() => {
    setIsClientSide(true);
  }, []);

  return (
    <ScrollArea className="h-[calc(100vh-126px)] px-4 pb-4 text-xs w-full">
      <div className="flex justify-end sticky top-0 bg-aiml-bg-2 py-2">
        {isUpdating
          ? "updating"
          : `${astDiagnostics?.length || 0} errors found`}
      </div>
      <div className="space-y-4">
        {isWorkflowLoading ? (
          <div className="flex items-center justify-center h-[calc(100vh-180px)]">
            <p className="text-gray-300/60">Loading workflow prompt...</p>
          </div>
        ) : (
          <div className="h-[calc(100vh-180px)]">
            {isClientSide ? (
              <CodeEditor
                key="prompt-editor"
                // className="w-full h-full p-3 bg-aiml-bg-1 border border-aiml-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-aiml-accent text-aiml-el-5 font-mono"
                value={prompt || ""}
                diagnostics={astDiagnostics || []}
                onChange={(value) => setPrompt(value || "")}
              />
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-180px)]">
                <p className="text-gray-300/60">Loading workflow prompt...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
