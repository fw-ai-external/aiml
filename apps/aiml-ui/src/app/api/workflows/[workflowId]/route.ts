import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const resolvedParams = await params;
  // Mock data for now - replace with actual API call
  return NextResponse.json({
    id: resolvedParams.workflowId,
    name: "Test Workflow",
    description: "A test workflow",
    stepGraph: {
      initial: [
        {
          step: {
            id: "step1",
            description: "First step",
          },
        },
      ],
    },
    stepSubscriberGraph: {},
  });
}
