import { NextResponse } from "next/server";

export async function GET() {
  // Mock data for now - replace with actual API call
  return NextResponse.json({
    tool1: {
      id: "tool1",
      name: "Test Tool",
      description: "A test tool",
      type: "default",
      config: {},
    },
  });
}
