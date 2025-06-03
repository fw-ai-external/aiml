/**
 * Server-Sent Events (SSE) Endpoints for Runtime Events
 *
 * Provides SSE fallback for WebSocket functionality with two streams:
 * 1. General events stream for new requests
 * 2. Specific request events stream that follows a request until completion
 */

import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { runtimeEventBus } from "../lib/runtimeEventBus";
import type { User } from "../types/user";
import type { RuntimeEvent } from "@aiml/runtime";

interface SSEConnection {
  accountId: string;
  runId?: string;
  lastReceivedSequenceNumber: number;
  connectionId: string;
}

// Store active SSE connections for cleanup
const activeConnections = new Map<string, SSEConnection>();

/**
 * SSE endpoint for general runtime events stream
 * This stream broadcasts new requests and general events
 */
export const sseGeneralEventsHandler = async (
  c: Context<{ Variables: { user: User } }>
) => {
  const user = c.get("user");

  if (!user?.accountId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const accountId = user.accountId;
  const connectionId = `general_${accountId}_${Date.now()}_${Math.random()}`;

  return streamSSE(c, async (stream) => {
    // Store connection for cleanup
    activeConnections.set(connectionId, {
      accountId,
      lastReceivedSequenceNumber: 0,
      connectionId,
    });

    // Send connection acknowledgment
    await stream.writeSSE({
      data: JSON.stringify({
        type: "connection_ack",
        data: {
          timestamp: new Date().toISOString(),
          message: "Connected to general events stream",
          accountId,
          connectionId,
        },
      }),
      event: "connection_ack",
      id: `${Date.now()}`,
    });

    // Create a mock WebSocket interface for SSE
    const mockWebSocket = {
      send: (message: string) => {
        try {
          const parsedMessage = JSON.parse(message);
          if (parsedMessage.type === "runtime_event") {
            stream
              .writeSSE({
                data: JSON.stringify({
                  type: "runtime_event",
                  data: parsedMessage.data,
                }),
                event: "runtime_event",
                id: String(parsedMessage.data.sequenceNumber),
              })
              .catch((error) => {
                console.error("Error writing to SSE stream:", error);
              });
          }
        } catch (error) {
          console.error("Error parsing event message:", error);
        }
      },
      readyState: 1,
    };

    // Subscribe to all events for this account
    const eventBusConnectionId = runtimeEventBus.subscribeToAllEvents(
      accountId,
      mockWebSocket,
      0
    );

    // Handle client disconnect
    stream.onAbort(() => {
      console.log(
        "SSE general events connection closed for accountId:",
        accountId
      );
      activeConnections.delete(connectionId);
      runtimeEventBus.unsubscribe(eventBusConnectionId);
    });

    // Keep connection alive with periodic heartbeat
    const heartbeatInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "heartbeat",
            data: {
              timestamp: new Date().toISOString(),
            },
          }),
          event: "heartbeat",
          id: `heartbeat_${Date.now()}`,
        });
      } catch (error) {
        console.error("Heartbeat failed:", error);
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Every 30 seconds

    // Cleanup on abort
    stream.onAbort(() => {
      clearInterval(heartbeatInterval);
    });

    // Keep the stream open indefinitely
    return new Promise(() => {}); // Never resolves, keeps stream open
  });
};

/**
 * SSE endpoint for specific request events stream
 * This stream follows a specific runId until completion
 */
export const sseRequestEventsHandler = async (
  c: Context<{ Variables: { user: User } }>
) => {
  const user = c.get("user");

  if (!user?.accountId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const runId = c.req.query("runId");
  const lastSequenceStr = c.req.query("lastSequenceNumber");
  const lastSequenceNumber = lastSequenceStr
    ? parseInt(lastSequenceStr, 10)
    : 0;

  if (!runId) {
    return c.json({ error: "runId query parameter is required" }, 400);
  }

  const accountId = user.accountId;
  const connectionId = `request_${accountId}_${runId}_${Date.now()}_${Math.random()}`;

  return streamSSE(c, async (stream) => {
    let isWorkflowComplete = false;

    // Store connection for cleanup
    activeConnections.set(connectionId, {
      accountId,
      runId,
      lastReceivedSequenceNumber: lastSequenceNumber,
      connectionId,
    });

    // Send connection acknowledgment
    await stream.writeSSE({
      data: JSON.stringify({
        type: "connection_ack",
        data: {
          timestamp: new Date().toISOString(),
          message: "Connected to request events stream",
          accountId,
          runId,
          connectionId,
        },
      }),
      event: "connection_ack",
      id: `${Date.now()}`,
    });

    // Send historical events if requested
    if (lastSequenceNumber >= 0) {
      const historicalEvents = runtimeEventBus.getHistoricalEvents(
        runId,
        accountId,
        lastSequenceNumber
      );

      for (const event of historicalEvents) {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "historical_event",
            data: event,
          }),
          event: "historical_event",
          id: String(event.sequenceNumber),
        });

        // Check if workflow is complete based on step status
        if (
          event.type === "step_transition" &&
          (event.status === "success" || event.status === "failed")
        ) {
          // This could indicate workflow completion, but we'll let it continue
          // until we get a definitive signal or timeout
        }
      }
    }

    // Set up event listener for this specific runId
    const eventListener = (event: RuntimeEvent) => {
      if (event.accountId === accountId && event.runId === runId) {
        stream
          .writeSSE({
            data: JSON.stringify({
              type: "runtime_event",
              data: event,
            }),
            event: "runtime_event",
            id: String(event.sequenceNumber),
          })
          .catch((error) => {
            console.error("Error writing to SSE stream:", error);
          });

        // Check if workflow is complete based on step status
        if (
          event.type === "step_transition" &&
          (event.status === "success" || event.status === "failed") &&
          event.metadata?.stepKey === "final" // Assuming final step has this metadata
        ) {
          isWorkflowComplete = true;
          // Send completion signal and close stream after a short delay
          setTimeout(async () => {
            try {
              await stream.writeSSE({
                data: JSON.stringify({
                  type: "stream_complete",
                  data: {
                    timestamp: new Date().toISOString(),
                    runId,
                    reason: event.status,
                  },
                }),
                event: "stream_complete",
                id: `complete_${Date.now()}`,
              });
            } catch (error) {
              console.error("Error sending completion signal:", error);
            }
          }, 1000);
        }
      }
    };

    // Subscribe to the event bus for this specific runId
    const eventBusConnectionId = runtimeEventBus.subscribeToWorkflow(
      runId,
      accountId,
      { send: eventListener, readyState: 1 }, // Mock WebSocket interface
      lastSequenceNumber
    );

    // Handle client disconnect
    stream.onAbort(() => {
      console.log("SSE request events connection closed for runId:", runId);
      activeConnections.delete(connectionId);
      runtimeEventBus.unsubscribe(eventBusConnectionId);
    });

    // Keep connection alive with periodic heartbeat (less frequent for specific requests)
    const heartbeatInterval = setInterval(async () => {
      if (isWorkflowComplete) {
        clearInterval(heartbeatInterval);
        return;
      }

      try {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "heartbeat",
            data: {
              timestamp: new Date().toISOString(),
              runId,
            },
          }),
          event: "heartbeat",
          id: `heartbeat_${Date.now()}`,
        });
      } catch (error) {
        console.error("Heartbeat failed:", error);
        clearInterval(heartbeatInterval);
      }
    }, 60000); // Every 60 seconds

    // Cleanup on abort
    stream.onAbort(() => {
      clearInterval(heartbeatInterval);
    });

    // Keep the stream open until workflow completes or client disconnects
    return new Promise(() => {}); // Never resolves, keeps stream open
  });
};

/**
 * SSE endpoint for getting historical events (non-streaming)
 */
export const sseHistoricalEventsHandler = async (
  c: Context<{ Variables: { user: User } }>
) => {
  const user = c.get("user");

  if (!user?.accountId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const runId = c.req.query("runId");
  const afterSequenceStr = c.req.query("afterSequenceNumber");
  const afterSequenceNumber = afterSequenceStr
    ? parseInt(afterSequenceStr, 10)
    : 0;

  if (!runId) {
    return c.json({ error: "runId query parameter is required" }, 400);
  }

  const accountId = user.accountId;
  const historicalEvents = runtimeEventBus.getHistoricalEvents(
    runId,
    accountId,
    afterSequenceNumber
  );

  return c.json({
    type: "historical_events",
    data: {
      runId,
      events: historicalEvents,
      count: historicalEvents.length,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * SSE route configurations
 */
export const sseRoutes = [
  {
    method: "get" as const,
    path: "/sse/events",
    handler: sseGeneralEventsHandler,
  },
  {
    method: "get" as const,
    path: "/sse/events/:runId",
    handler: sseRequestEventsHandler,
  },
  {
    method: "get" as const,
    path: "/sse/historical",
    handler: sseHistoricalEventsHandler,
  },
];

/**
 * Cleanup function for graceful shutdown
 */
export const cleanupSSEConnections = () => {
  for (const [connectionId, connection] of activeConnections.entries()) {
    console.log("Cleaning up SSE connection:", connectionId);
    activeConnections.delete(connectionId);
  }
};
