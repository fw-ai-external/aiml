import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { WorkflowEndpoints } from "./workflow-endpoints";
import { WorkflowLogs } from "./workflow-logs";
import { WorkflowTrigger } from "./workflow-trigger";
import { WorkflowPrompt } from "@/domains/workflows/workflow-prompt";
import { WorkflowDebug } from "@/domains/workflows/workflow-debug";

export function WorkflowInformation({ workflowId }: { workflowId: string }) {
  const [runId, setRunId] = useState<string>("");
  return (
    <Tabs defaultValue="run">
      <TabsList className="flex shrink-0 border-b">
        <TabsTrigger value="prompt" className="group">
          <p className="text-xs p-3 text-aimll-3 group-data-[state=active]:text-aiaiml5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            Prompt
          </p>
        </TabsTrigger>
        <TabsTrigger value="ast" className="group">
          <p className="text-xs p-3 text-aiml-el-3 group-data-[state=active]:text-aiml-el-5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            AST
          </p>
        </TabsTrigger>

        <TabsTrigger value="elementTree" className="group">
          <p className="text-xs p-3 text-aiml-el-3 group-data-[state=active]:text-aiml-el-5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            Element Tree
          </p>
        </TabsTrigger>
        <TabsTrigger value="stepGraph" className="group">
          <p className="text-xs p-3 text-aiml-el-3 group-data-[state=active]:text-aiml-el-5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            Graph
          </p>
        </TabsTrigger>
        <TabsTrigger value="run" className="group">
          <p className="text-xs p-3 text-aiml-el-3 group-data-[state=active]:text-aiml-el-5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            Run
          </p>
        </TabsTrigger>
        <TabsTrigger value="logs" className="group">
          <p className="text-xs p-3 text-aimll-3 group-data-[state=active]:text-aiaiml5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            Log Drains
          </p>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="run">
        {workflowId ? (
          <WorkflowTrigger workflowId={workflowId} setRunId={setRunId} />
        ) : null}
      </TabsContent>
      <TabsContent value="endpoints">
        <WorkflowEndpoints workflowId={workflowId} />
      </TabsContent>
      <TabsContent value="logs">
        <WorkflowLogs runId={runId} />
      </TabsContent>
      <TabsContent value="prompt">
        <WorkflowPrompt workflowId={workflowId} />
      </TabsContent>
      <TabsContent value="ast">
        <WorkflowDebug workflowId={workflowId} debugType="ast" />
      </TabsContent>
      <TabsContent value="elementTree">
        <WorkflowDebug workflowId={workflowId} debugType="elementTree" />
      </TabsContent>
      <TabsContent value="stepGraph">
        <WorkflowDebug workflowId={workflowId} debugType="stepGraph" />
      </TabsContent>
    </Tabs>
  );
}
