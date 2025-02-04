import { mastra } from "@/mastra";
import { NextResponse } from "next/server";
export async function POST(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const workflowId = params.workflowId as string;
    const workflow = mastra.getWorkflow(workflowId as any);
    const body = await request.json();

    const result = await workflow.execute({
      triggerData: body,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Error executing workflow" },
      { status: 500 }
    );
  }
}
