import { Span } from "@/domains/traces/types";
import { NextResponse } from "next/server";

export async function GET() {
  // Mock data for now - replace with actual API call

  const mockSpans: Span[] = [
    {
      id: "1",
      name: "Test Span 1",
      duration: 1000,
      parentSpanId: null,
      traceId: "1",
      scope: "test",
      kind: 1,
      status: { code: 200 },
      events: [
        {
          attributes: [
            {
              key: "test",
              value: {
                test: "test",
              },
            },
          ],
          name: "Test Event 1",
          timeUnixNano: "1713859200000",
          droppedAttributesCount: 0,
        },
      ],
      links: [],
      attributes: {
        test: "test",
      },
      startTime: 1713859200000,
      endTime: 1713862800000,
      other: {
        droppedAttributesCount: 0,
        droppedEventsCount: 0,
        droppedLinksCount: 0,
      },
      createdAt: "2024-04-20T12:00:00Z",
    },
  ];

  return NextResponse.json(mockSpans);
}
