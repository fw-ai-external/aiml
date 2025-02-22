import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const resolvedParams = await params;
  const { stepId, runId, context } = await request.json();

  // Mock data for now - replace with actual API call
  return NextResponse.json({
    id: resolvedParams.workflowId,
    status: "resumed",
    result: {
      stepId,
      runId,
      context,
      output: "Workflow resumed successfully",
    },
  });
