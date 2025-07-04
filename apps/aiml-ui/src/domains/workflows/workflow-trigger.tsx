import jsonSchemaToZod from "json-schema-to-zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { parse } from "superjson";
import { z } from "zod";

import { DynamicForm } from "@/components/dynamic-form";
import { resolveSerializedZodOutput } from "@/components/dynamic-form/utils";
import { Button } from "@/components/ui/button";
import { CodeBlockDemo } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

import {
  useExecuteWorkflow,
  useResumeWorkflow,
  useWatchWorkflow,
  useWorkflow,
} from "@/hooks/use-workflows";

interface SuspendedStep {
  stepId: string;
  runId: string;
}

interface WorkflowPath {
  stepId: string;
}

export function WorkflowTrigger({
  workflowId,
  setRunId,
}: {
  workflowId: string;
  setRunId: (runId: string) => void;
}) {
  const { isLoading, executionGraph, triggerSchema } = useWorkflow(workflowId);
  const { executeWorkflow, isExecutingWorkflow } = useExecuteWorkflow();
  const { watchWorkflow, watchResult } = useWatchWorkflow();
  const { resumeWorkflow, isResumingWorkflow } = useResumeWorkflow();
  const [result, setResult] = useState<any>(null);
  const [suspendedSteps, setSuspendedSteps] = useState<SuspendedStep[]>([]);

  const handleExecuteWorkflow = async (data: any) => {
    if (!executionGraph) return;

    watchWorkflow({ workflowId });

    const result = await executeWorkflow({
      workflowId,
      input: data,
    });

    setResult(result);
    setRunId(result.runId);
  };

  const handleResumeWorkflow = async (
    step: SuspendedStep & { context: any }
  ) => {
    if (!executionGraph) return;

    const { stepId, runId, context } = step;
    const result = await resumeWorkflow({
      stepId,
      runId,
      context,
      workflowId,
    });

    setResult(result);
  };

  useEffect(() => {
    if (!watchResult?.activePaths || !result?.runId) return;

    const suspended = watchResult.activePaths
      .filter(
        (path: WorkflowPath) =>
          watchResult.context?.steps?.[path.stepId]?.status === "suspended"
      )
      .map((path: WorkflowPath) => ({
        stepId: path.stepId,
        runId: result.runId,
      }));
    setSuspendedSteps(suspended);
  }, [watchResult, result]);

  if (isLoading) {
    return (
      <ScrollArea className="h-[calc(100vh-126px)] pt-2 px-4 pb-4 text-xs">
        <div className="space-y-4">
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <Skeleton className="h-3" />
            <Skeleton className="h-3" />
          </div>
        </div>
      </ScrollArea>
    );
  }

  if (!executionGraph) return null;

  if (!triggerSchema) {
    return (
      <ScrollArea className="h-[calc(100vh-126px)] pt-2 px-4 pb-4 text-xs w-full">
        <div className="space-y-4">
          <div className="space-y-4 px-4">
            <Button
              className="w-full"
              disabled={isExecutingWorkflow}
              onClick={() => handleExecuteWorkflow(null)}
            >
              {isExecutingWorkflow ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Trigger"
              )}
            </Button>
          </div>

          <div>
            <Text
              variant="secondary"
              className="text-aiml-el-3  px-4"
              size="xs"
            >
              Output
            </Text>
            <div className="flex flex-col gap-2">
              <CopyButton
                classname="absolute z-40 top-4 right-4 w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out"
                content={JSON.stringify(result ?? {}, null, 2)}
              />
            </div>
            <CodeBlockDemo
              className="w-[368px] overflow-x-auto"
              code={JSON.stringify(result ?? {}, null, 2)}
              language="json"
            />
          </div>
        </div>
      </ScrollArea>
    );
  }

  const zodInputSchema = resolveSerializedZodOutput(
    jsonSchemaToZod(parse(triggerSchema))
  );

  return (
    <ScrollArea className="h-[calc(100vh-126px)] pt-2 px-4 pb-4 text-xs w-[400px]">
      <div className="space-y-4">
        <div>
          {suspendedSteps.length > 0 ? (
            suspendedSteps?.map((step) => (
              <div className="px-4">
                <Text variant="secondary" className="text-aimll-3" size="xs">
                  {step.stepId}
                </Text>
                <DynamicForm
                  schema={z.record(z.string(), z.any())}
                  isSubmitLoading={isResumingWorkflow}
                  submitButtonLabel="Resume"
                  onSubmit={(data) => {
                    handleResumeWorkflow({
                      stepId: step.stepId,
                      runId: step.runId,
                      context: data,
                    });
                  }}
                />
              </div>
            ))
          ) : (
            <></>
          )}

          <div className="flex items-center justify-between w-full">
            <Text variant="secondary" className="text-aimll-3 px-4" size="xs">
              Input
            </Text>
            {isResumingWorkflow ? (
              <span className="flex items-center gap-1">
                <Loader2 className="animate-spin w-3 h-3 text-aimll-accent" />{" "}
                Resuming workflow
              </span>
            ) : (
              <></>
            )}
          </div>
          <DynamicForm
            schema={zodInputSchema}
            isSubmitLoading={isExecutingWorkflow}
            onSubmit={(data) => {
              handleExecuteWorkflow(data);
            }}
          />
        </div>

        <div>
          <Text variant="secondary" className="text-aimll-3  px-4" size="xs">
            Output
          </Text>
          <div className="flex flex-col gap-2">
            <CopyButton
              classname="absolute z-40 top-4 right-4 w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out"
              content={JSON.stringify(result ?? {}, null, 2)}
            />
          </div>
          <CodeBlockDemo
            className="w-[368px] overflow-x-auto"
            code={JSON.stringify(result ?? {}, null, 2)}
            language="json"
          />
        </div>
      </div>
    </ScrollArea>
  );
}
