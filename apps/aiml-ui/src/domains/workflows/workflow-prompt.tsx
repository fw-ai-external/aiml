import { RefreshCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkflow } from "@/hooks/use-workflows";
import { useState, useEffect } from "react";
import { Workflow } from "@mastra/core/workflows";

export function WorkflowPrompt({ workflowId }: { workflowId: string }) {
  const {
    workflow,
    isLoading: isWorkflowLoading,
    updateWorkflow,
    isUpdating,
  } = useWorkflow(workflowId);
  const [prompt, setPrompt] = useState(workflow?.prompt || null);

  useEffect(() => {
    if (!prompt && workflow?.prompt) {
      setPrompt(workflow.prompt);
    }
    if (workflow && prompt !== workflow.prompt) {
      updateWorkflow({ ...workflow, prompt } as Workflow & {
        prompt: string;
      }).catch((error) => {
        console.error("Error updating workflow prompt", error);
      });
    }
  }, [prompt, workflow]);

  return (
    <ScrollArea className="h-[calc(100vh-126px)] px-4 pb-4 text-xs w-[400px]">
      <div className="flex justify-end sticky top-0 bg-aiml-bg-2 py-2">
        <Button variant="outline" onClick={() => {}}>
          {isWorkflowLoading ? (
            <RefreshCcwIcon className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcwIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
      <div className="space-y-4">
        {isWorkflowLoading ? (
          <div className="flex items-center justify-center h-[calc(100vh-180px)]">
            <p className="text-gray-300/60">Loading workflow prompt...</p>
          </div>
        ) : (
          <div className="h-[calc(100vh-180px)]">
            <textarea
              className="w-full h-full p-3 bg-aiml-bg-1 border border-aiml-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-aiml-accent text-aiml-el-5 font-mono"
              value={prompt || ""}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
