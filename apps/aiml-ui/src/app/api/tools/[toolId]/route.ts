import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ toolId: string }> }) {
  const resolvedParams = await params;
  // Mock data for now - replace with actual API call
  return NextResponse.json({
    id: resolvedParams.toolId,
    name: 'Test Tool',
    description: 'A test tool',
    type: 'default',
    config: {},
  });
}
