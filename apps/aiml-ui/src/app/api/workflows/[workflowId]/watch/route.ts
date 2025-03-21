import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const resolvedParams = await params;
  const encoder = new TextEncoder();

  // Create a stream to send updates
  const stream = new ReadableStream({
    start(controller) {
      // Mock data for now - replace with actual API call
      const data = {
        activePaths: ['step1'],
        context: { status: 'running' },
        timestamp: new Date().toISOString(),
      };

      // Send the data with the record separator
      controller.enqueue(encoder.encode(JSON.stringify(data) + '\x1E'));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
