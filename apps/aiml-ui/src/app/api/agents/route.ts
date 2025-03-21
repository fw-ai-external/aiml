import { NextResponse } from 'next/server';

export async function GET() {
  // Mock data for now - replace with actual API call
  return NextResponse.json({
    agent1: {
      id: 'agent1',
      name: 'Test Agent',
      description: 'A test agent',
      tools: {},
      provider: 'openai',
      modelId: 'gpt-4',
    },
  });
}
