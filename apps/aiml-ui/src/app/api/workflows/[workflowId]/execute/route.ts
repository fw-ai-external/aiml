import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const resolvedParams = await params;
  const input = await request.json();

  // Mock data for now - replace with actual API call
  return NextResponse.json({
    id: resolvedParams.workflowId,
    status: 'completed',
    result: {
      output: 'Workflow executed successfully',
      input,
    },
  });
}
