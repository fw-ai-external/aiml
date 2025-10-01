/**
 * Unit Tests for RuntimeEventBus
 *
 * Tests event bus functionality, queuing, TTL, account filtering
 */

import { afterEach, beforeEach, describe, expect, test, spyOn } from "bun:test";
import { RuntimeEventBus } from "./runtimeEventBus";
import type { RuntimeEvent } from "@aiml/runtime";

// Mock WebSocket for testing
class MockWebSocket {
  public readyState = 1; // WebSocket.OPEN
  public sentMessages: string[] = [];

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
  }
}

describe("RuntimeEventBus", () => {
  let eventBus: RuntimeEventBus;
  let mockWs1: MockWebSocket;
  let mockWs2: MockWebSocket;

  beforeEach(() => {
    eventBus = new RuntimeEventBus({
      maxEvents: 10,
      ttlMs: 1000, // 1 second for testing
    });
    mockWs1 = new MockWebSocket();
    mockWs2 = new MockWebSocket();
  });

  afterEach(() => {
    eventBus.destroy();
  });

  describe("subscribeToWorkflow", () => {
    test("should create a subscription and return connection ID", () => {
      const connectionId = eventBus.subscribeToWorkflow(
        "run-1",
        "account-1",
        mockWs1,
        0
      );

      expect(connectionId).toMatch(/^account-1_run-1_\d+_\d+$/);
    });

    test("should send historical events on subscription", () => {
      // First, add some events
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
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "success",
        timestamp: new Date(),
        sequenceNumber: 2,
      };

      eventBus.broadcastEvent(event1);
      eventBus.broadcastEvent(event2);

      // Now subscribe and expect historical events
      eventBus.subscribeToWorkflow("run-1", "account-1", mockWs1, 0);

      expect(mockWs1.sentMessages).toHaveLength(2);

      const message1 = JSON.parse(mockWs1.sentMessages[0]);
      const message2 = JSON.parse(mockWs1.sentMessages[1]);

      expect(message1.type).toBe("runtime_event");
      expect(message1.data.sequenceNumber).toBe(1);
      expect(message2.type).toBe("runtime_event");
      expect(message2.data.sequenceNumber).toBe(2);
    });

    test("should only send events after lastReceivedSequenceNumber", () => {
      // Add events
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
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "success",
        timestamp: new Date(),
        sequenceNumber: 2,
      };

      eventBus.broadcastEvent(event1);
      eventBus.broadcastEvent(event2);

      // Subscribe with lastReceivedSequenceNumber = 1
      eventBus.subscribeToWorkflow("run-1", "account-1", mockWs1, 1);

      // Should only receive event2
      expect(mockWs1.sentMessages).toHaveLength(1);
      const message = JSON.parse(mockWs1.sentMessages[0]);
      expect(message.data.sequenceNumber).toBe(2);
    });
  });

  describe("unsubscribe", () => {
    test("should remove connection", () => {
      const connectionId = eventBus.subscribeToWorkflow(
        "run-1",
        "account-1",
        mockWs1,
        0
      );

      eventBus.unsubscribe(connectionId);

      // Broadcast an event - should not be received
      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);
      expect(mockWs1.sentMessages).toHaveLength(0);
    });
  });

  describe("getHistoricalEvents", () => {
    test("should return events for specific runId and accountId", () => {
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

      const historicalEvents = eventBus.getHistoricalEvents(
        "run-1",
        "account-1",
        0
      );

      expect(historicalEvents).toHaveLength(1);
      expect(historicalEvents[0].runId).toBe("run-1");
    });

    test("should filter by afterSequenceNumber", () => {
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
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "success",
        timestamp: new Date(),
        sequenceNumber: 2,
      };

      eventBus.broadcastEvent(event1);
      eventBus.broadcastEvent(event2);

      const historicalEvents = eventBus.getHistoricalEvents(
        "run-1",
        "account-1",
        1
      );

      expect(historicalEvents).toHaveLength(1);
      expect(historicalEvents[0].sequenceNumber).toBe(2);
    });

    test("should return empty array for non-existent runId", () => {
      const historicalEvents = eventBus.getHistoricalEvents(
        "non-existent",
        "account-1",
        0
      );
      expect(historicalEvents).toHaveLength(0);
    });
  });

  describe("broadcastEvent", () => {
    test("should send event to all relevant subscribers", () => {
      // Subscribe two connections to the same runId
      eventBus.subscribeToWorkflow("run-1", "account-1", mockWs1, 0);
      eventBus.subscribeToWorkflow("run-1", "account-1", mockWs2, 0);

      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(1);
    });

    test("should enforce account isolation", () => {
      // Subscribe connections for different accounts
      eventBus.subscribeToWorkflow("run-1", "account-1", mockWs1, 0);
      eventBus.subscribeToWorkflow("run-1", "account-2", mockWs2, 0);

      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      // Only account-1 connection should receive the event
      expect(mockWs1.sentMessages).toHaveLength(1);
      expect(mockWs2.sentMessages).toHaveLength(0);
    });

    test("should update lastReceivedSequenceNumber", () => {
      const connectionId = eventBus.subscribeToWorkflow(
        "run-1",
        "account-1",
        mockWs1,
        0
      );

      const event1: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 5,
      };

      eventBus.broadcastEvent(event1);

      // Verify the sequence number was updated by checking historical events
      const historicalEvents = eventBus.getHistoricalEvents(
        "run-1",
        "account-1",
        5
      );
      expect(historicalEvents).toHaveLength(0); // Should be empty since we're asking for events after 5
    });

    test("should handle closed WebSocket connections", () => {
      const connectionId = eventBus.subscribeToWorkflow(
        "run-1",
        "account-1",
        mockWs1,
        0
      );

      // Close the WebSocket
      mockWs1.readyState = 3; // WebSocket.CLOSED

      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      // Connection should be removed automatically
      const stats = eventBus.getQueueStats();
      expect(stats.activeConnections).toBe(0);
    });
  });

  describe("TTL and cleanup", () => {
    test("should expire events after TTL", async () => {
      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      // Initially should have the event
      let historicalEvents = eventBus.getHistoricalEvents(
        "run-1",
        "account-1",
        0
      );
      expect(historicalEvents).toHaveLength(1);

      // Wait for TTL to expire (1 second + buffer)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Trigger cleanup manually for testing
      (eventBus as any).cleanupExpiredEvents();

      // Event should be expired
      historicalEvents = eventBus.getHistoricalEvents("run-1", "account-1", 0);
      expect(historicalEvents).toHaveLength(0);
    });

    test("should enforce maxEvents limit", () => {
      // Add more events than the limit (10)
      for (let i = 1; i <= 15; i++) {
        const event: RuntimeEvent = {
          type: "step_transition",
          runId: "run-1",
          accountId: "account-1",
          stepId: `step-${i}`,
          status: "entering",
          timestamp: new Date(),
          sequenceNumber: i,
        };
        eventBus.broadcastEvent(event);
      }

      const historicalEvents = eventBus.getHistoricalEvents(
        "run-1",
        "account-1",
        0
      );

      // Should only have the last 10 events
      expect(historicalEvents).toHaveLength(10);
      expect(historicalEvents[0].sequenceNumber).toBe(6); // First event should be sequence 6
      expect(historicalEvents[9].sequenceNumber).toBe(15); // Last event should be sequence 15
    });
  });

  describe("getQueueStats", () => {
    test("should return accurate statistics", () => {
      // Add events for different runIds and accounts
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

      // Add connections
      eventBus.subscribeToWorkflow("run-1", "account-1", mockWs1, 0);
      eventBus.subscribeToWorkflow("run-2", "account-1", mockWs2, 0);

      const stats = eventBus.getQueueStats();

      expect(stats.totalQueues).toBe(2);
      expect(stats.totalEvents).toBe(2);
      expect(stats.activeConnections).toBe(2);
      expect(stats.queueDetails).toHaveLength(2);

      const queue1 = stats.queueDetails.find(
        (q) => q.queueKey === "account-1:run-1"
      );
      const queue2 = stats.queueDetails.find(
        (q) => q.queueKey === "account-1:run-2"
      );

      expect(queue1?.eventCount).toBe(1);
      expect(queue1?.lastSequenceNumber).toBe(1);
      expect(queue2?.eventCount).toBe(1);
      expect(queue2?.lastSequenceNumber).toBe(1);
    });
  });

  describe("error handling", () => {
    test("should handle WebSocket send errors gracefully", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

      // Mock WebSocket that throws on send
      const errorWs = {
        readyState: 1,
        send: () => {
          throw new Error("Send failed");
        },
      };

      const connectionId = eventBus.subscribeToWorkflow(
        "run-1",
        "account-1",
        errorWs,
        0
      );

      const event: RuntimeEvent = {
        type: "step_transition",
        runId: "run-1",
        accountId: "account-1",
        stepId: "step-1",
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: 1,
      };

      eventBus.broadcastEvent(event);

      // Should log error and remove connection
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error sending event to connection"),
        expect.any(Error)
      );

      const stats = eventBus.getQueueStats();
      expect(stats.activeConnections).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe("condition check events", () => {
    test("should handle condition check events", () => {
      eventBus.subscribeToWorkflow("run-1", "account-1", mockWs1, 0);

      const event: RuntimeEvent = {
        type: "condition_check",
        runId: "run-1",
        accountId: "account-1",
        conditionId: "condition-1",
        conditionType: "if",
        expression: "x > 5",
        result: true,
        timestamp: new Date(),
        sequenceNumber: 1,
        context: { x: 10 },
      };

      eventBus.broadcastEvent(event);

      expect(mockWs1.sentMessages).toHaveLength(1);
      const message = JSON.parse(mockWs1.sentMessages[0]);
      expect(message.type).toBe("runtime_event");
      expect(message.data.type).toBe("condition_check");
      expect(message.data.conditionType).toBe("if");
      expect(message.data.result).toBe(true);
    });
  });
});
