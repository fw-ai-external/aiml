import { JsonViewer } from "@/components/json-viewer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkflow } from "@/hooks/use-workflows";
import { RefreshCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function WorkflowDebug({
  workflowId,
  debugType,
}: {
  workflowId: string;
  debugType: "ast" | "elementTree" | "stepGraph";
}) {
  const {
    prompt: workflowPrompt,
    isLoading: isWorkflowLoading,
    astDiagnostics,
    elementTree,
    astNodes,
    executionGraph,
    datamodel,
    updatePrompt,
    isUpdating,
  } = useWorkflow(workflowId);
  const [prompt, setPrompt] = useState(workflowPrompt || null);

  useEffect(() => {
    if (!prompt && workflowPrompt) {
      setPrompt(workflowPrompt);
    }
    if (workflowPrompt && prompt !== workflowPrompt) {
      updatePrompt(prompt || "").catch((error) => {
        console.error("Error updating workflow prompt", error);
      });
    }
  }, [prompt, workflowPrompt]);

  return (
    <ScrollArea className="h-[calc(100vh-126px)] px-4 pb-4 text-xs w-full">
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
        {!astNodes && (isWorkflowLoading || isUpdating) ? (
          <div className="flex items-center justify-center h-[calc(100vh-180px)]">
            <p className="text-gray-300/60">Building AST...</p>
          </div>
        ) : (
          <div className="h-[calc(100vh-180px)]">
            <JsonViewer
              key={`${debugType}-${workflowId}`}
              data={
                debugType === "ast"
                  ? {
                      nodes: astNodes,
                      diagnostics: astDiagnostics,
                      datamodel: datamodel,
                    }
                  : debugType === "elementTree"
                    ? elementTree
                    : executionGraph
              }
            />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
