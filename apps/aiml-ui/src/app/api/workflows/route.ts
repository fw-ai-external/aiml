import { NextResponse } from "next/server";

export async function GET() {
  // Mock data for now - replace with actual API call
  return NextResponse.json({
    workflow1: {
      id: "workflow1",
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
    },
  });
}
