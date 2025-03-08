import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { WorkflowEndpoints } from "./workflow-endpoints";
import { WorkflowLogs } from "./workflow-logs";
import { WorkflowTrigger } from "./workflow-trigger";
import { WorkflowPrompt } from "@/domains/workflows/workflow-prompt";
import { WorkflowDebug } from "@/domains/workflows/workflow-debug";
import { WorkflowChat } from "@/domains/workflows/workflow-chat";

export function WorkflowInformation({ workflowId }: { workflowId: string }) {
  const [runId, setRunId] = useState<string>("");
  return (
    <Tabs defaultValue="prompt">
      <TabsList className="flex shrink-0 border-b">
        <TabsTrigger value="prompt" className="group">
          <p className="text-xs p-3 text-aiml-el-3 group-data-[state=active]:text-aiml-el-5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
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
        <TabsTrigger value="agent" className="group">
          <p className="text-xs p-3 text-aiml-el-3 group-data-[state=active]:text-aiml-el-5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            Run Agent
          </p>
        </TabsTrigger>
        <TabsTrigger value="chat" className="group">
          <p className="text-xs p-3 text-aiml-el-3 group-data-[state=active]:text-aiml-el-5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            Chat
          </p>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="agent">
        {workflowId ? (
          <WorkflowTrigger workflowId={workflowId} setRunId={setRunId} />
        ) : null}
      </TabsContent>
      <TabsContent value="chat">
        {workflowId ? (
          <WorkflowChat workflowId={workflowId} setRunId={setRunId} />
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
        <WorkflowDebug
          key={`stepGraph-${workflowId}`}
          workflowId={workflowId}
          debugType="stepGraph"
        />
      </TabsContent>
    </Tabs>
  );
}
