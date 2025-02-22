import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const resolvedParams = await params;
  // Mock data for now - replace with actual API call
  return NextResponse.json({
    id: resolvedParams.agentId,
    name: "Test Agent",
    description: "A test agent",
    tools: {},
    provider: "openai",
    modelId: "gpt-4",
  });
}
