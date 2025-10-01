/**
 * Integration Tests for WebSocket System
 *
 * Tests WebSocket server integration with event bus, account isolation,
 * room management, and historical event retrieval
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { RuntimeEventBus } from "../lib/runtimeEventBus";
import { handleWebSocketConnection } from "../endpoints/websocket";
import type { RuntimeEvent } from "@aiml/runtime";

// Mock WebSocket for testing
class MockWebSocket {
  public readyState = 1; // WebSocket.OPEN
  private _sentMessages: string[] = [];
  public id: string;
  private eventHandlers: { [key: string]: Function[] } = {};

  constructor() {
    this.id = `mockWs_${Math.random().toString(36).substring(2, 9)}`;
  }

  get eventHandlerCount(): number {
    return Object.keys(this.eventHandlers).length;
  }

  get sentMessages(): string[] {
    // Return a copy of the messages to prevent external modification
    return [...this._sentMessages];
  }

  send(message: string) {
    // Create a new array to ensure proper tracking
    this._sentMessages = [...this._sentMessages, message];
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
    return this.sentMessages.map((msg) =>
      typeof msg === "string" ? JSON.parse(msg) : msg
    );
  }

  clearMessages() {
    this._sentMessages = [];
  }
}

describe("WebSocket Integration Tests", () => {
  let eventBus: RuntimeEventBus;
  let mockWs1: MockWebSocket;
  let mockWs2: MockWebSocket;
  let mockWs3: MockWebSocket;

  beforeEach(() => {
    eventBus = new RuntimeEventBus({
      maxEvents: 100,
      ttlMs: 60000, // 1 minute for testing
    });

    // We'll pass the eventBus directly to handleWebSocketConnection

    mockWs1 = new MockWebSocket();
    mockWs2 = new MockWebSocket();
    mockWs3 = new MockWebSocket();
  });

  afterEach(() => {
    eventBus.destroy();
  });

  describe("Account Isolation", () => {
    test("should isolate events between different accounts", () => {
      // Connect clients from different accounts
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      handleWebSocketConnection(mockWs2, "account-2", eventBus);

      // Wait for connection setup
      while (
        mockWs1.sentMessages.length < 1 ||
        mockWs2.sentMessages.length < 1
      ) {}

      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Subscribe both to the same runId
      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "shared-run-id" },
      });

      mockWs2.receiveMessage({
        type: "subscribe",
        data: { runId: "shared-run-id" },
      });

      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Broadcast event for account-1
      const event1: RuntimeEvent = {
        type: "step_transition",
        runId: "shared-run-id",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event1);

      // Only account-1 client should receive the event
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(0);

      // Broadcast event for account-2
      const event2: RuntimeEvent = {
        type: "step_transition",
        runId: "shared-run-id",
        accountId: "account-2",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event2);

      // Now account-2 client should receive the event
      expect(mockWs1.sentMessages).toHaveLength(1); // Still only 1
      expect(mockWs2.sentMessages).toHaveLength(1); // Now has 1

      // Verify event content
      const account1Event = JSON.parse(mockWs1.sentMessages[0]);
      const account2Event = JSON.parse(mockWs2.sentMessages[0]);

      expect(account1Event.data.accountId).toBe("account-1");
      expect(account2Event.data.accountId).toBe("account-2");
    });

    test("should isolate historical events by account", () => {
      // Add events for different accounts
      const event1: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      const event2: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run",
        accountId: "account-2",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event1);
      eventBus.broadcastEvent(event2);

      // Connect and request historical events
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      handleWebSocketConnection(mockWs2, "account-2", eventBus);

      mockWs1.clearMessages();
      mockWs2.clearMessages();

      mockWs1.receiveMessage({
        type: "get_historical",
        data: { runId: "test-run", afterSequenceNumber: 0 },
      });

      mockWs2.receiveMessage({
        type: "get_historical",
        data: { runId: "test-run", afterSequenceNumber: 0 },
      });

      // Each should only see their own events
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(1);

      const account1Historical = JSON.parse(mockWs1.sentMessages[0]);
      const account2Historical = JSON.parse(mockWs2.sentMessages[0]);

      expect(account1Historical.data.events).toHaveLength(1);
      expect(account2Historical.data.events).toHaveLength(1);
      expect(account1Historical.data.events[0].accountId).toBe("account-1");
      expect(account2Historical.data.events[0].accountId).toBe("account-2");
    });
  });

  describe("Room Management", () => {
    test("should manage multiple rooms (runIds) per account", () => {
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      handleWebSocketConnection(mockWs2, "account-1", eventBus);

      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Subscribe to different runIds
      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "run-1" },
      });

      mockWs2.receiveMessage({
        type: "subscribe",
        data: { runId: "run-2" },
      });

      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Broadcast events for different runs
      const event1: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      const event2: RuntimeEvent = {
        type: "step_transition",
        runId: "run-2",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event1);
      eventBus.broadcastEvent(event2);

      // Each client should only receive events for their subscribed runId
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(1);

      const ws1Event = JSON.parse(mockWs1.sentMessages[0]);
      const ws2Event = JSON.parse(mockWs2.sentMessages[0]);

      expect(ws1Event.data.runId).toBe("run-1");
      expect(ws2Event.data.runId).toBe("run-2");
    });

    test("should support multiple clients in the same room", () => {
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      handleWebSocketConnection(mockWs2, "account-1", eventBus);

      // Clear initial connection messages
      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Both subscribe to the same runId
      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "shared-run" },
      });

      mockWs2.receiveMessage({
        type: "subscribe",
        data: { runId: "shared-run" },
      });

      // Clear subscription messages
      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Broadcast event
      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "shared-run",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      // Both clients should receive the runtime event
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(1);

      const ws1Event = JSON.parse(mockWs1.sentMessages[0]);
      const ws2Event = JSON.parse(mockWs2.sentMessages[0]);

      expect(ws1Event.data.runId).toBe("shared-run");
      expect(ws2Event.data.runId).toBe("shared-run");
      expect(ws1Event.data.sequenceNumber).toBe(1);
      expect(ws2Event.data.sequenceNumber).toBe(1);
    });

    test("should handle room switching", () => {
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      // Subscribe to first room
      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "run-1" },
      });

      mockWs1.clearMessages();

      // Broadcast event to first room
      const event1: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event1);
      expect(mockWs1.sentMessages).toHaveLength(1);

      mockWs1.clearMessages();

      // Switch to second room
      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "run-2" },
      });

      mockWs1.clearMessages();

      // Broadcast events to both rooms
      const event2: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-2",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 2,
      };

      const event3: RuntimeEvent = {
        type: "step_transition",
        runId: "run-2",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event2);
      eventBus.broadcastEvent(event3);

      // Should only receive event for run-2 (current subscription)
      expect(mockWs1.sentMessages).toHaveLength(1);
      const receivedEvent = JSON.parse(mockWs1.sentMessages[0]);
      expect(receivedEvent.data.runId).toBe("run-2");
    });
  });

  describe("Historical Event Retrieval", () => {
    test("should retrieve historical events in correct order", () => {
      // Add multiple events
      const events: RuntimeEvent[] = [];
      for (let i = 1; i <= 5; i++) {
        const event: RuntimeEvent = {
          type: "step_transition",
          runId: "test-run",
          accountId: "account-1",
          stepId: `step-${i}`,
          status: "entering",
          timestamp: new Date(),
          sequenceNumber: i,
        };
        events.push(event);
        eventBus.broadcastEvent(event);
      }

      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      mockWs1.receiveMessage({
        type: "get_historical",
        data: { runId: "test-run", afterSequenceNumber: 0 },
      });

      expect(mockWs1.sentMessages).toHaveLength(1);
      const response = JSON.parse(mockWs1.sentMessages[0]);

      expect(response.type).toBe("historical_events");
      expect(response.data.events).toHaveLength(5);
      expect(response.data.count).toBe(5);

      // Verify order
      for (let i = 0; i < 5; i++) {
        expect(response.data.events[i].sequenceNumber).toBe(i + 1);
        expect(response.data.events[i].stepId).toBe(`step-${i + 1}`);
      }
    });

    test("should filter historical events by sequence number", () => {
      // Add events
      for (let i = 1; i <= 5; i++) {
        const event: RuntimeEvent = {
          type: "step_transition",
          runId: "test-run",
          accountId: "account-1",
          stepId: `step-${i}`,
          status: "entering",
          timestamp: new Date(),
          sequenceNumber: i,
        };
        eventBus.broadcastEvent(event);
      }

      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      // Request events after sequence 3
      mockWs1.receiveMessage({
        type: "get_historical",
        data: { runId: "test-run", afterSequenceNumber: 3 },
      });

      expect(mockWs1.sentMessages).toHaveLength(1);
      const response = JSON.parse(mockWs1.sentMessages[0]);

      expect(response.data.events).toHaveLength(2);
      expect(response.data.events[0].sequenceNumber).toBe(4);
      expect(response.data.events[1].sequenceNumber).toBe(5);
    });

    test("should handle subscription with historical event replay", () => {
      // Add historical events
      for (let i = 1; i <= 3; i++) {
        const event: RuntimeEvent = {
          type: "step_transition",
          runId: "test-run",
          accountId: "account-1",
          stepId: `step-${i}`,
          status: "entering",
          timestamp: new Date(),
          sequenceNumber: i,
        };
        eventBus.broadcastEvent(event);
      }

      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      // Subscribe with lastReceivedSequenceNumber = 1
      mockWs1.receiveMessage({
        type: "subscribe",
        data: {
          runId: "test-run",
          lastReceivedSequenceNumber: 1,
        },
      });

      // Should receive subscription confirmation + historical events 2 and 3
      expect(mockWs1.sentMessages).toHaveLength(3);

      // Historical events are sent first, then subscription confirmation
      const historicalEvent1 = JSON.parse(mockWs1.sentMessages[0]);
      const historicalEvent2 = JSON.parse(mockWs1.sentMessages[1]);
      const subscribeResponse = JSON.parse(mockWs1.sentMessages[2]);

      expect(historicalEvent1.type).toBe("runtime_event");
      expect(historicalEvent1.data.sequenceNumber).toBe(2);
      expect(historicalEvent2.type).toBe("runtime_event");
      expect(historicalEvent2.data.sequenceNumber).toBe(3);
      expect(subscribeResponse.type).toBe("subscribed");
    });
  });

  describe("Event Broadcasting Integration", () => {
    test("should handle mixed event types", () => {
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run" },
      });

      mockWs1.clearMessages();

      // Broadcast step transition event
      const stepEvent: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      // Broadcast condition check event
      const conditionEvent: RuntimeEvent = {
        type: "condition_check",
        runId: "test-run",
        accountId: "account-1",
        conditionId: "condition-1",
        conditionType: "if",
        expression: "x > 5",
        result: true,
        timestamp: new Date(),
        sequenceNumber: 2,
      };

      eventBus.broadcastEvent(stepEvent);
      eventBus.broadcastEvent(conditionEvent);

      expect(mockWs1.sentMessages).toHaveLength(2);

      const stepMessage = JSON.parse(mockWs1.sentMessages[0]);
      const conditionMessage = JSON.parse(mockWs1.sentMessages[1]);

      expect(stepMessage.data.type).toBe("step_transition");
      expect(stepMessage.data.stepId).toBe("step-1");
      expect(conditionMessage.data.type).toBe("condition_check");
      expect(conditionMessage.data.conditionType).toBe("if");
      expect(conditionMessage.data.result).toBe(true);
    });

    test("should maintain sequence numbers across connections", () => {
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      handleWebSocketConnection(mockWs2, "account-1", eventBus);

      // Clear initial connection messages
      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Both subscribe to same run
      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run" },
      });

      mockWs2.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run" },
      });

      // Clear subscription messages
      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Broadcast multiple events
      for (let i = 1; i <= 3; i++) {
        const event: RuntimeEvent = {
          type: "step_transition",
          runId: "test-run",
          accountId: "account-1",
          stepId: `step-${i}`,
          status: "entering",
          timestamp: new Date(),
          sequenceNumber: i,
        };
        eventBus.broadcastEvent(event);
      }

      // Both should receive all 3 runtime events
      expect(mockWs1.sentMessages).toHaveLength(3);
      expect(mockWs2.sentMessages).toHaveLength(3);

      for (let i = 0; i < 3; i++) {
        const ws1Event = JSON.parse(mockWs1.sentMessages[i]);
        const ws2Event = JSON.parse(mockWs2.sentMessages[i]);

        expect(ws1Event.data.sequenceNumber).toBe(i + 1);
        expect(ws2Event.data.sequenceNumber).toBe(i + 1);
        expect(ws1Event.data.stepId).toBe(`step-${i + 1}`);
        expect(ws2Event.data.stepId).toBe(`step-${i + 1}`);
      }
    });
  });

  describe("Connection Management", () => {
    test("should clean up connections on close", () => {
      handleWebSocketConnection(mockWs1, "account-1", eventBus);

      // Wait for connection message
      while (mockWs1.sentMessages.length < 1) {}
      mockWs1.clearMessages();

      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "test-run" },
      });

      // Wait for subscription message
      while (mockWs1.sentMessages.length < 1) {}
      mockWs1.clearMessages();

      // Verify connection is active
      let stats = eventBus.getQueueStats();
      expect(stats.activeConnections).toBe(1);

      // Close connection
      mockWs1.close();

      // Connection should be cleaned up
      stats = eventBus.getQueueStats();
      expect(stats.activeConnections).toBe(0);

      // Events should no longer be delivered
      mockWs1.clearMessages();
      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);
      expect(mockWs1.sentMessages).toHaveLength(0);
    });

    test("should handle multiple connections from same account", () => {
      // Connect multiple WebSockets from same account
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      handleWebSocketConnection(mockWs2, "account-1", eventBus);
      handleWebSocketConnection(mockWs3, "account-1", eventBus);

      // Clear initial connection messages
      mockWs1.clearMessages();
      mockWs2.clearMessages();
      mockWs3.clearMessages();

      // All subscribe to same run
      [mockWs1, mockWs2, mockWs3].forEach((ws) => {
        ws.receiveMessage({
          type: "subscribe",
          data: { runId: "test-run" },
        });
      });

      // Clear subscription messages
      [mockWs1, mockWs2, mockWs3].forEach((ws) => ws.clearMessages());

      // Broadcast event
      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "test-run",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      // All should receive the runtime event
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(1);
      expect(mockWs3.sentMessages).toHaveLength(1);

      // Verify stats
      const stats = eventBus.getQueueStats();
      expect(stats.activeConnections).toBe(3);
    });
  });
});
