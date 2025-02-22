import { NextResponse } from "next/server";

export async function GET() {
  // Mock data for now - replace with actual API call
  return NextResponse.json({
    agent1: {
      name: "Test Agent",
      instructions: "Test instructions",
      provider: "openai",
      modelId: "gpt-4",
    },
  });
}
