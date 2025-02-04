import { mastra } from "@/mastra";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const workflows = await mastra.getWorkflows({ serialized: true });
  return NextResponse.json(workflows);
}
