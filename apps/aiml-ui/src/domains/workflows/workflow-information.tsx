import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { WorkflowChat } from "@/domains/workflows/workflow-chat";
import { WorkflowDebug } from "@/domains/workflows/workflow-debug";
import { WorkflowPrompt } from "@/domains/workflows/workflow-prompt";
import { WorkflowEndpoints } from "./workflow-endpoints";
import { WorkflowLogs } from "./workflow-logs";

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
        <TabsTrigger value="datamodel" className="group">
          <p className="text-xs p-3 text-aiml-el-3 group-data-[state=active]:text-aiml-el-5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            Datamodel
          </p>
        </TabsTrigger>
        <TabsTrigger value="chat" className="group">
          <p className="text-xs p-3 text-aiml-el-3 group-data-[state=active]:text-aiml-el-5 group-data-[state=active]:border-b-2 group-data-[state=active]:pb-2.5 border-white">
            Chat
          </p>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="datamodel">
        <WorkflowDebug workflowId={workflowId} debugType="datamodel" />
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
