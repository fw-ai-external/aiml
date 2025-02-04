import { mastra } from "@/mastra";
import { NextResponse } from "next/server";
import { stringify } from "superjson";
import { zodToJsonSchema } from "zod-to-json-schema";
export async function GET(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  const { workflowId } = await params;
  const workflow = mastra.getWorkflow(workflowId as any);

  const triggerSchema = workflow?.triggerSchema;
  const stepGraph = workflow.stepGraph;
  const stepSubscriberGraph = workflow.stepSubscriberGraph;
  const serializedSteps = Object.entries(workflow.steps).reduce<any>(
    (acc, [key, step]) => {
      const _step = step as any;
      acc[key] = {
        ..._step,
        inputSchema: _step.inputSchema
          ? stringify(zodToJsonSchema(_step.inputSchema) as any)
          : undefined,
        outputSchema: _step.outputSchema
          ? stringify(zodToJsonSchema(_step.outputSchema) as any)
          : undefined,
      };
      return acc;
    },
    {}
  );

  return NextResponse.json({
    name: workflow.name,
    triggerSchema: triggerSchema
      ? stringify(zodToJsonSchema(triggerSchema) as any)
      : undefined,
    steps: serializedSteps,
    stepGraph,
    stepSubscriberGraph,
  });
}
