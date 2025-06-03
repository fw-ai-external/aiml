/**
 * Unit Tests for WebSocket Endpoint
 *
 * Tests WebSocket endpoint logic, message handling, authentication
 */

import { afterEach, beforeEach, describe, expect, test, spyOn } from "bun:test";
import type { Context } from "hono";
import { websocketHandler, handleWebSocketConnection } from "./websocket";
import { RuntimeEventBus } from "../lib/runtimeEventBus";
import type { User } from "../types/user";
import type { RuntimeEvent } from "@aiml/runtime";

// Mock WebSocket for testing
class MockWebSocket {
  public readyState = 1; // WebSocket.OPEN
  public sentMessages: string[] = [];
  private eventHandlers: { [key: string]: Function[] } = {};

  send(message: string) {
    this.sentMessages.push(message);
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  emit(event: string, ...args: any[]) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach((handler) => handler(...args));
    }
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.emit("close");
  }

  error(err: Error) {
    this.emit("error", err);
  }

  // Helper to simulate receiving a message
  receiveMessage(message: any) {
    const buffer = Buffer.from(JSON.stringify(message));
    this.emit("message", buffer);
  }

  getLastMessage() {
    return this.sentMessages.length > 0
      ? JSON.parse(this.sentMessages[this.sentMessages.length - 1])
      : null;
  }

  getAllMessages() {
    return this.sentMessages.map((msg) => JSON.parse(msg));
  }
}

// Mock Hono Context
function createMockContext(
  user?: User,
  headers: Record<string, string> = {}
): Context {
  const mockRequest = {
    header: (name: string) => headers[name.toLowerCase()],
  };

  const mockContext = {
    get: (key: string) => (key === "user" ? user : undefined),
    req: mockRequest,
    json: (data: any, status?: number) =>
      new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { "Content-Type": "application/json" },
      }),
  } as any;

  return mockContext;
}

describe("WebSocket Endpoint", () => {
  let mockWs: MockWebSocket;
  let testUser: User;
  let eventBus: RuntimeEventBus;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    testUser = {
      username: "testuser",
      email: "test@example.com",
      accountId: "test-account-1",
      apiKey: "test-api-key",
    };
    eventBus = new RuntimeEventBus({
      maxEvents: 100,
      ttlMs: 60000,
    });
  });

  afterEach(() => {
    // Clean up any subscriptions
    eventBus.destroy();
  });

  describe("websocketHandler", () => {
    test("should reject requests without authentication", async () => {
      const context = createMockContext();
      const response = await websocketHandler(context);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Authentication required");
    });

    test("should reject non-WebSocket requests", async () => {
      const context = createMockContext(testUser, {});
      const response = await websocketHandler(context);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("WebSocket upgrade required");
    });

    test("should accept WebSocket upgrade requests", async () => {
      const context = createMockContext(testUser, { upgrade: "websocket" });
      const response = await websocketHandler(context);

      expect(response.status).toBe(101);
      expect(response.headers.get("Upgrade")).toBe("websocket");
      expect(response.headers.get("Connection")).toBe("Upgrade");
    });
  });

  describe("handleWebSocketConnection", () => {
    test("should send connection acknowledgment", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);

      expect(mockWs.sentMessages).toHaveLength(1);
      const ackMessage = mockWs.getLastMessage();

      expect(ackMessage.type).toBe("connection_ack");
      expect(ackMessage.data.accountId).toBe(testUser.accountId);
      expect(ackMessage.data.message).toBe(
        "Connected to runtime events stream"
      );
    });

    test("should handle subscribe message", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      mockWs.receiveMessage({
        type: "subscribe",
        data: {
          runId: "test-run-1",
          lastReceivedSequenceNumber: 0,
        },
      });

      expect(mockWs.sentMessages).toHaveLength(1);
      const subscribeResponse = mockWs.getLastMessage();

      expect(subscribeResponse.type).toBe("subscribed");
      expect(subscribeResponse.data.runId).toBe("test-run-1");
      expect(subscribeResponse.data.accountId).toBe(testUser.accountId);
      expect(subscribeResponse.data.connectionId).toMatch(
        /^test-account-1_test-run-1_\d+_\d+$/
      );
    });

    test("should handle subscribe message without runId", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      mockWs.receiveMessage({
        type: "subscribe",
        data: {},
      });

      expect(mockWs.sentMessages).toHaveLength(1);
      const errorResponse = mockWs.getLastMessage();

      expect(errorResponse.type).toBe("error");
      expect(errorResponse.data.message).toBe(
        "runId is required for subscription"
      );
    });

    test("should handle unsubscribe message", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      // First subscribe
      mockWs.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run-1" },
      });

      mockWs.sentMessages = []; // Clear subscribe response

      // Then unsubscribe
      mockWs.receiveMessage({
        type: "unsubscribe",
      });

      expect(mockWs.sentMessages).toHaveLength(1);
      const unsubscribeResponse = mockWs.getLastMessage();

      expect(unsubscribeResponse.type).toBe("unsubscribed");
    });

    test("should handle get_historical message", () => {
      // First add some historical events
      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run-1",
        accountId: testUser.accountId,
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      mockWs.receiveMessage({
        type: "get_historical",
        data: {
          runId: "test-run-1",
          afterSequenceNumber: 0,
        },
      });

      expect(mockWs.sentMessages).toHaveLength(1);
      const historicalResponse = mockWs.getLastMessage();

      expect(historicalResponse.type).toBe("historical_events");
      expect(historicalResponse.data.runId).toBe("test-run-1");
      expect(historicalResponse.data.events).toHaveLength(1);
      expect(historicalResponse.data.count).toBe(1);
    });

    test("should handle get_historical message without runId", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      mockWs.receiveMessage({
        type: "get_historical",
        data: {},
      });

      expect(mockWs.sentMessages).toHaveLength(1);
      const errorResponse = mockWs.getLastMessage();

      expect(errorResponse.type).toBe("error");
      expect(errorResponse.data.message).toBe(
        "runId is required for historical events"
      );
    });

    test("should handle ping message", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      mockWs.receiveMessage({
        type: "ping",
      });

      expect(mockWs.sentMessages).toHaveLength(1);
      const pongResponse = mockWs.getLastMessage();

      expect(pongResponse.type).toBe("pong");
      expect(pongResponse.data.timestamp).toBeDefined();
    });

    test("should handle unknown message type", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      mockWs.receiveMessage({
        type: "unknown_type",
      });

      expect(mockWs.sentMessages).toHaveLength(1);
      const errorResponse = mockWs.getLastMessage();

      expect(errorResponse.type).toBe("error");
      expect(errorResponse.data.message).toBe(
        "Unknown message type: unknown_type"
      );
    });

    test("should handle invalid JSON message", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      // Simulate invalid JSON
      const invalidBuffer = Buffer.from("invalid json");
      mockWs.emit("message", invalidBuffer);

      expect(mockWs.sentMessages).toHaveLength(1);
      const errorResponse = mockWs.getLastMessage();

      expect(errorResponse.type).toBe("error");
      expect(errorResponse.data.message).toBe(
        "Invalid message format. Expected JSON."
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error parsing WebSocket message:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test("should handle connection close", () => {
      const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);

      // Subscribe first
      mockWs.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run-1" },
      });

      // Close connection
      mockWs.close();

      expect(consoleSpy).toHaveBeenCalledWith(
        "WebSocket connection closed for accountId:",
        testUser.accountId
      );

      consoleSpy.mockRestore();
    });

    test("should handle connection error", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);

      // Subscribe first
      mockWs.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run-1" },
      });

      // Trigger error
      const testError = new Error("Connection error");
      mockWs.error(testError);

      expect(consoleSpy).toHaveBeenCalledWith(
        "WebSocket error for accountId:",
        testUser.accountId,
        testError
      );

      consoleSpy.mockRestore();
    });

    test("should unsubscribe from previous connection when subscribing to new runId", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      // Subscribe to first runId
      mockWs.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run-1" },
      });

      expect(mockWs.sentMessages).toHaveLength(1);
      mockWs.sentMessages = []; // Clear first subscribe response

      // Subscribe to second runId
      mockWs.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run-2" },
      });

      expect(mockWs.sentMessages).toHaveLength(1);
      const subscribeResponse = mockWs.getLastMessage();

      expect(subscribeResponse.type).toBe("subscribed");
      expect(subscribeResponse.data.runId).toBe("test-run-2");
    });

    test("should receive runtime events after subscription", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      // Subscribe
      mockWs.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run-1" },
      });

      mockWs.sentMessages = []; // Clear subscribe response

      // Broadcast an event
      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run-1",
        accountId: testUser.accountId,
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      expect(mockWs.sentMessages).toHaveLength(1);
      const eventMessage = mockWs.getLastMessage();

      expect(eventMessage.type).toBe("runtime_event");
      expect(eventMessage.data.type).toBe("step_transition");
      expect(eventMessage.data.runId).toBe("test-run-1");
      expect(eventMessage.data.stepId).toBe("step-1");
    });

    test("should not receive events for different accounts", () => {
      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      // Subscribe
      mockWs.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run-1" },
      });

      mockWs.sentMessages = []; // Clear subscribe response

      // Broadcast an event for a different account
      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run-1",
        accountId: "different-account",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      // Should not receive the event
      expect(mockWs.sentMessages).toHaveLength(0);
    });

    test("should handle subscription with lastReceivedSequenceNumber", () => {
      // First add some historical events
      const event1: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run-1",
        accountId: testUser.accountId,
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      const event2: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run-1",
        accountId: testUser.accountId,
        stepId: "step-1",
        status: "success",
        timestamp: new Date(),
        sequenceNumber: 2,
      };

      eventBus.broadcastEvent(event1);
      eventBus.broadcastEvent(event2);

      handleWebSocketConnection(mockWs, testUser.accountId, eventBus);
      mockWs.sentMessages = []; // Clear ack message

      // Subscribe with lastReceivedSequenceNumber = 1
      mockWs.receiveMessage({
        type: "subscribe",
        data: {
          runId: "test-run-1",
          lastReceivedSequenceNumber: 1,
        },
      });

      // Should receive subscribe response + historical event with sequence 2
      expect(mockWs.sentMessages).toHaveLength(2);

      // Historical events are sent first, then subscription confirmation
      const historicalEvent = JSON.parse(mockWs.sentMessages[0]);
      const subscribeResponse = JSON.parse(mockWs.sentMessages[1]);

      expect(historicalEvent.type).toBe("runtime_event");
      expect(historicalEvent.data.sequenceNumber).toBe(2);
      expect(subscribeResponse.type).toBe("subscribed");
    });
  });
});
