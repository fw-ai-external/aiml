/**
 * WebSocket Endpoint for Runtime Events
 *
 * Provides real-time streaming of workflow runtime events via WebSocket.
 * Supports reconnection with sequence number tracking and account-based filtering.
 */

import type { Context } from "hono";
import { runtimeEventBus } from "../lib/runtimeEventBus";
import type { User } from "../types/user";

interface WebSocketMessage {
  type: string;
  data?: any;
}

interface ConnectionParams {
  runId: string;
  lastReceivedSequenceNumber?: number;
}

/**
 * WebSocket upgrade handler for runtime events
 * This will be handled by the WebSocket server integration
 */
export const websocketHandler = async (
  c: Context<{ Variables: { user: User } }>
) => {
  const user = c.get("user");

  if (!user?.accountId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  // Check if this is a WebSocket upgrade request
  const upgrade = c.req.header("upgrade");
  if (upgrade !== "websocket") {
    return c.json(
      {
        error: "WebSocket upgrade required",
        message:
          "This endpoint requires WebSocket connection. Use ws:// or wss:// protocol.",
      },
      400
    );
  }

  // Return upgrade response - actual WebSocket handling will be done by server
  return new Response(null, {
    status: 101,
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
    },
  });
};

/**
 * Handle WebSocket connection after upgrade
 * This function will be called by the WebSocket server
 */
export function handleWebSocketConnection(
  ws: any,
  accountId: string,
  eventBus = runtimeEventBus
) {
  let currentConnectionId: string | null = null;

  // Send connection acknowledgment
  ws.send(
    JSON.stringify({
      type: "connection_ack",
      data: {
        timestamp: new Date().toISOString(),
        message: "Connected to runtime events stream",
        accountId,
      },
    })
  );

  ws.on("message", (data: Buffer) => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      handleWebSocketMessage(ws, message, accountId);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: {
            message: "Invalid message format. Expected JSON.",
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed for accountId:", accountId);
    if (currentConnectionId) {
      eventBus.unsubscribe(currentConnectionId);
      currentConnectionId = null;
    }
  });

  ws.on("error", (error: Error) => {
    console.error("WebSocket error for accountId:", accountId, error);
    if (currentConnectionId) {
      eventBus.unsubscribe(currentConnectionId);
      currentConnectionId = null;
    }
  });

  /**
   * Handle incoming WebSocket messages
   */
  function handleWebSocketMessage(
    ws: any,
    message: WebSocketMessage,
    accountId: string
  ) {
    switch (message.type) {
      case "subscribe":
        handleSubscribe(ws, message.data, accountId);
        break;

      case "subscribe_all":
        handleSubscribeAll(ws, accountId);
        break;

      case "unsubscribe":
        handleUnsubscribe(ws);
        break;

      case "get_historical":
        handleGetHistorical(ws, message.data, accountId);
        break;

      case "ping":
        ws.send(
          JSON.stringify({
            type: "pong",
            data: {
              timestamp: new Date().toISOString(),
            },
          })
        );
        break;

      default:
        ws.send(
          JSON.stringify({
            type: "error",
            data: {
              message: `Unknown message type: ${message.type}`,
              timestamp: new Date().toISOString(),
            },
          })
        );
    }
  }

  /**
   * Handle subscription to a workflow's events
   */
  function handleSubscribe(ws: any, data: ConnectionParams, accountId: string) {
    if (!data?.runId) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: {
            message: "runId is required for subscription",
            timestamp: new Date().toISOString(),
          },
        })
      );
      return;
    }

    // Unsubscribe from previous connection if exists
    if (currentConnectionId) {
      eventBus.unsubscribe(currentConnectionId);
    }

    // Subscribe to new workflow
    currentConnectionId = eventBus.subscribeToWorkflow(
      data.runId,
      accountId,
      ws,
      data.lastReceivedSequenceNumber ?? 0
    );

    ws.send(
      JSON.stringify({
        type: "subscribed",
        data: {
          runId: data.runId,
          accountId,
          connectionId: currentConnectionId,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }

  /**
   * Handle subscription to all events for an account
   */
  function handleSubscribeAll(ws: any, accountId: string) {
    // Unsubscribe from previous connection if exists
    if (currentConnectionId) {
      eventBus.unsubscribe(currentConnectionId);
    }

    // Subscribe to all events for this account
    currentConnectionId = eventBus.subscribeToAllEvents(accountId, ws, 0);

    ws.send(
      JSON.stringify({
        type: "subscribed_all",
        data: {
          accountId,
          connectionId: currentConnectionId,
          timestamp: new Date().toISOString(),
          message: "Subscribed to all events for account",
        },
      })
    );
  }

  /**
   * Handle unsubscription
   */
  function handleUnsubscribe(ws: any) {
    if (currentConnectionId) {
      eventBus.unsubscribe(currentConnectionId);
      currentConnectionId = null;

      ws.send(
        JSON.stringify({
          type: "unsubscribed",
          data: {
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  }

  /**
   * Handle request for historical events
   */
  function handleGetHistorical(
    ws: any,
    data: { runId: string; afterSequenceNumber?: number },
    accountId: string
  ) {
    if (!data?.runId) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: {
            message: "runId is required for historical events",
            timestamp: new Date().toISOString(),
          },
        })
      );
      return;
    }

    const historicalEvents = eventBus.getHistoricalEvents(
      data.runId,
      accountId,
      data.afterSequenceNumber ?? 0
    );

    ws.send(
      JSON.stringify({
        type: "historical_events",
        data: {
          runId: data.runId,
          events: historicalEvents,
          count: historicalEvents.length,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }
}

/**
 * WebSocket route configuration
 */
export const websocketRoute = {
  method: "get" as const,
  path: "/ws/runtime-events",
  handler: websocketHandler,
};
