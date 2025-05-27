/**
 * End-to-End Tests for WebSocket Runtime Events
 *
 * Tests complete flow: API request → workflow execution → event emission → WebSocket delivery
 * Tests reconnection scenarios with sequence numbers
 * Tests multiple accounts with proper isolation
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { RuntimeEventEmitter, type RuntimeEvent } from "@aiml/runtime";
import { RuntimeEventBus } from "../src/lib/runtimeEventBus";
import { handleWebSocketConnection } from "../src/endpoints/websocket";

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

  clearMessages() {
    this.sentMessages = [];
  }
}

// Mock workflow execution that emits events
class MockWorkflowExecution {
  private eventEmitter: RuntimeEventEmitter;
  private eventBus: RuntimeEventBus;
  private runId: string;
  private accountId: string;

  constructor(runId: string, accountId: string, eventBus: RuntimeEventBus) {
    this.runId = runId;
    this.accountId = accountId;
    this.eventBus = eventBus;
    this.eventEmitter = new RuntimeEventEmitter();

    // Connect runtime events to the event bus
    this.eventEmitter.onEvent((event) => {
      this.eventBus.broadcastEvent(event);
    });
  }

  async executeWorkflow(steps: string[]): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];

      // Emit step entering
      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "entering",
        input: { stepIndex: i },
      });

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Emit condition check if needed
      if (i % 2 === 0) {
        this.eventEmitter.emitConditionCheck({
          runId: this.runId,
          accountId: this.accountId,
          conditionId: `condition-${i}`,
          conditionType: "if",
          expression: `step${i}.completed`,
          result: true,
          context: { stepIndex: i },
        });
      }

      // Emit step success
      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "success",
        output: { result: `Step ${i} completed` },
        metadata: { duration: 10 },
      });
    }
  }

  async executeWithError(steps: string[], errorAtStep: number): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];

      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "entering",
        input: { stepIndex: i },
      });

      if (i === errorAtStep) {
        this.eventEmitter.emitStepTransition({
          runId: this.runId,
          accountId: this.accountId,
          stepId,
          status: "failed",
          output: { error: "Simulated error" },
        });
        break;
      }

      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "success",
        output: { result: `Step ${i} completed` },
      });
    }
  }
}

describe("WebSocket Runtime Events E2E", () => {
  let eventBus: RuntimeEventBus;
  let mockWs1: MockWebSocket;
  let mockWs2: MockWebSocket;
  let mockWs3: MockWebSocket;

  beforeEach(() => {
    eventBus = new RuntimeEventBus({
      maxEvents: 1000,
      ttlMs: 300000, // 5 minutes for testing
    });

    mockWs1 = new MockWebSocket();
    mockWs2 = new MockWebSocket();
    mockWs3 = new MockWebSocket();
  });

  afterEach(() => {
    eventBus.destroy();
  });

  describe("Complete Workflow Execution Flow", () => {
    test("should stream events during workflow execution", async () => {
      // Connect WebSocket client
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      // Subscribe to workflow
      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "workflow-run-1" },
      });

      mockWs1.clearMessages();

      // Execute workflow
      const workflow = new MockWorkflowExecution(
        "workflow-run-1",
        "account-1",
        eventBus
      );
      await workflow.executeWorkflow(["step1", "step2", "step3"]);

      // Should receive all events in real-time
      const messages = mockWs1.getAllMessages();

      // Expected events: 3 steps × 2 events (entering + success) + 2 condition checks = 8 events
      expect(messages).toHaveLength(8);

      // Verify event sequence
      expect(messages[0].data.type).toBe("step_transition");
      expect(messages[0].data.stepId).toBe("step1");
      expect(messages[0].data.status).toBe("entering");

      expect(messages[1].data.type).toBe("condition_check");
      expect(messages[1].data.conditionId).toBe("condition-0");

      expect(messages[2].data.type).toBe("step_transition");
      expect(messages[2].data.stepId).toBe("step1");
      expect(messages[2].data.status).toBe("success");

      // Verify sequence numbers are incremental
      for (let i = 0; i < messages.length; i++) {
        expect(messages[i].data.sequenceNumber).toBe(i + 1);
      }
    });

    test("should handle workflow execution with errors", async () => {
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "workflow-run-error" },
      });

      mockWs1.clearMessages();

      // Execute workflow with error at step 1
      const workflow = new MockWorkflowExecution(
        "workflow-run-error",
        "account-1",
        eventBus
      );
      await workflow.executeWithError(["step1", "step2", "step3"], 1);

      const messages = mockWs1.getAllMessages();

      // Should receive: step1 entering, step1 success, step2 entering, step2 failed = 4 events
      expect(messages).toHaveLength(4);

      expect(messages[0].data.stepId).toBe("step1");
      expect(messages[0].data.status).toBe("entering");
      expect(messages[1].data.stepId).toBe("step1");
      expect(messages[1].data.status).toBe("success");
      expect(messages[2].data.stepId).toBe("step2");
      expect(messages[2].data.status).toBe("entering");
      expect(messages[3].data.stepId).toBe("step2");
      expect(messages[3].data.status).toBe("failed");
      expect(messages[3].data.output.error).toBe("Simulated error");
    });

    test("should support multiple concurrent workflows", async () => {
      // Connect two clients for different workflows
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      handleWebSocketConnection(mockWs2, "account-1", eventBus);

      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Subscribe to different workflows
      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "workflow-A" },
      });

      mockWs2.receiveMessage({
        type: "subscribe",
        data: { runId: "workflow-B" },
      });

      mockWs1.clearMessages();
      mockWs2.clearMessages();

      // Execute workflows concurrently
      const workflowA = new MockWorkflowExecution(
        "workflow-A",
        "account-1",
        eventBus
      );
      const workflowB = new MockWorkflowExecution(
        "workflow-B",
        "account-1",
        eventBus
      );

      await Promise.all([
        workflowA.executeWorkflow(["stepA1", "stepA2"]),
        workflowB.executeWorkflow(["stepB1", "stepB2", "stepB3"]),
      ]);

      // Each client should only receive events for their workflow
      const messagesA = mockWs1.getAllMessages();
      const messagesB = mockWs2.getAllMessages();

      // Workflow A: 2 steps × 2 events + 1 condition = 5 events
      expect(messagesA).toHaveLength(5);
      messagesA.forEach((msg) => {
        expect(msg.data.runId).toBe("workflow-A");
      });

      // Workflow B: 3 steps × 2 events + 2 conditions = 8 events
      expect(messagesB).toHaveLength(8);
      messagesB.forEach((msg) => {
        expect(msg.data.runId).toBe("workflow-B");
      });
    });
  });

  describe("Reconnection Scenarios", () => {
    test("should handle client reconnection with sequence number tracking", async () => {
      // Initial connection and workflow execution
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "reconnect-test" },
      });

      mockWs1.clearMessages();

      // Execute partial workflow
      const workflow = new MockWorkflowExecution(
        "reconnect-test",
        "account-1",
        eventBus
      );
      await workflow.executeWorkflow(["step1", "step2"]);

      const initialMessages = mockWs1.getAllMessages();
      expect(initialMessages).toHaveLength(5); // 2 steps × 2 + 1 condition

      // Simulate disconnection
      mockWs1.close();

      // Continue workflow execution while disconnected
      await workflow.executeWorkflow(["step3", "step4"]);

      // Reconnect with last received sequence number
      const mockWs1Reconnected = new MockWebSocket();
      handleWebSocketConnection(mockWs1Reconnected, "account-1");
      mockWs1Reconnected.clearMessages();

      mockWs1Reconnected.receiveMessage({
        type: "subscribe",
        data: {
          runId: "reconnect-test",
          lastReceivedSequenceNumber: 5, // Last sequence from initial connection
        },
      });

      // Should receive subscription confirmation + missed events
      const reconnectMessages = mockWs1Reconnected.getAllMessages();

      // Should have subscription response + missed events (step3 and step4 execution)
      expect(reconnectMessages.length).toBeGreaterThan(1);

      const subscribeResponse = reconnectMessages[0];
      expect(subscribeResponse.type).toBe("subscribed");

      // Verify missed events start from sequence 6
      const missedEvents = reconnectMessages.slice(1);
      if (missedEvents.length > 0) {
        expect(missedEvents[0].data.sequenceNumber).toBeGreaterThan(5);
      }
    });

    test("should handle reconnection with no missed events", async () => {
      // Execute workflow completely
      const workflow = new MockWorkflowExecution(
        "complete-workflow",
        "account-1",
        eventBus
      );
      await workflow.executeWorkflow(["step1", "step2"]);

      // Connect after workflow completion
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      // Get historical events first to know the last sequence
      mockWs1.receiveMessage({
        type: "get_historical",
        data: { runId: "complete-workflow", afterSequenceNumber: 0 },
      });

      const historicalResponse = mockWs1.getLastMessage();
      const lastSequence = Math.max(
        ...historicalResponse.data.events.map((e: any) => e.sequenceNumber)
      );

      mockWs1.clearMessages();

      // Subscribe with the last sequence number
      mockWs1.receiveMessage({
        type: "subscribe",
        data: {
          runId: "complete-workflow",
          lastReceivedSequenceNumber: lastSequence,
        },
      });

      // Should only receive subscription confirmation, no historical events
      expect(mockWs1.sentMessages).toHaveLength(1);
      const subscribeResponse = mockWs1.getLastMessage();
      expect(subscribeResponse.type).toBe("subscribed");
    });

    test("should handle multiple reconnections", async () => {
      const workflow = new MockWorkflowExecution(
        "multi-reconnect",
        "account-1",
        eventBus
      );

      // First connection - receive some events
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "multi-reconnect" },
      });

      mockWs1.clearMessages();

      await workflow.executeWorkflow(["step1"]);
      const firstBatch = mockWs1.getAllMessages();
      const firstLastSequence = Math.max(
        ...firstBatch.map((msg) => msg.data.sequenceNumber)
      );

      // Second connection - receive more events
      mockWs1.close();
      const mockWs1Second = new MockWebSocket();
      handleWebSocketConnection(mockWs1Second, "account-1");
      mockWs1Second.clearMessages();

      mockWs1Second.receiveMessage({
        type: "subscribe",
        data: {
          runId: "multi-reconnect",
          lastReceivedSequenceNumber: firstLastSequence,
        },
      });

      mockWs1Second.clearMessages();

      await workflow.executeWorkflow(["step2"]);
      const secondBatch = mockWs1Second.getAllMessages();
      const secondLastSequence = Math.max(
        ...secondBatch.map((msg) => msg.data.sequenceNumber)
      );

      // Third connection - should get remaining events
      mockWs1Second.close();
      const mockWs1Third = new MockWebSocket();
      handleWebSocketConnection(mockWs1Third, "account-1");
      mockWs1Third.clearMessages();

      mockWs1Third.receiveMessage({
        type: "subscribe",
        data: {
          runId: "multi-reconnect",
          lastReceivedSequenceNumber: secondLastSequence,
        },
      });

      mockWs1Third.clearMessages();

      await workflow.executeWorkflow(["step3"]);
      const thirdBatch = mockWs1Third.getAllMessages();

      // Verify all events were received across connections
      const allEvents = [...firstBatch, ...secondBatch, ...thirdBatch];
      const sequences = allEvents
        .map((msg) => msg.data.sequenceNumber)
        .sort((a, b) => a - b);

      // Should have consecutive sequence numbers
      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBe(sequences[i - 1] + 1);
      }
    });
  });

  describe("Multi-Account Isolation", () => {
    test("should isolate events between accounts during concurrent workflows", async () => {
      // Connect clients from different accounts
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      handleWebSocketConnection(mockWs2, "account-2", eventBus);
      handleWebSocketConnection(mockWs3, "account-1", eventBus); // Same account as ws1

      mockWs1.clearMessages();
      mockWs2.clearMessages();
      mockWs3.clearMessages();

      // All subscribe to workflows with same runId but different accounts
      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "shared-run-id" },
      });

      mockWs2.receiveMessage({
        type: "subscribe",
        data: { runId: "shared-run-id" },
      });

      mockWs3.receiveMessage({
        type: "subscribe",
        data: { runId: "shared-run-id" },
      });

      mockWs1.clearMessages();
      mockWs2.clearMessages();
      mockWs3.clearMessages();

      // Execute workflows for different accounts
      const workflowAccount1 = new MockWorkflowExecution(
        "shared-run-id",
        "account-1",
        eventBus
      );
      const workflowAccount2 = new MockWorkflowExecution(
        "shared-run-id",
        "account-2",
        eventBus
      );

      await Promise.all([
        workflowAccount1.executeWorkflow(["account1-step1", "account1-step2"]),
        workflowAccount2.executeWorkflow(["account2-step1", "account2-step2"]),
      ]);

      // Account-1 clients should only see account-1 events
      const account1Messages1 = mockWs1.getAllMessages();
      const account1Messages3 = mockWs3.getAllMessages();
      const account2Messages = mockWs2.getAllMessages();

      // Both account-1 clients should receive the same events
      expect(account1Messages1).toHaveLength(account1Messages3.length);

      account1Messages1.forEach((msg, index) => {
        expect(msg.data.accountId).toBe("account-1");
        expect(msg.data.stepId).toContain("account1");
        expect(msg).toEqual(account1Messages3[index]);
      });

      // Account-2 client should only see account-2 events
      account2Messages.forEach((msg) => {
        expect(msg.data.accountId).toBe("account-2");
        expect(msg.data.stepId).toContain("account2");
      });

      // Verify no cross-contamination
      expect(account1Messages1.length).toBeGreaterThan(0);
      expect(account2Messages.length).toBeGreaterThan(0);
      expect(account1Messages1.length).toBe(account2Messages.length); // Same workflow structure
    });

    test("should handle account isolation during reconnection", async () => {
      // Execute workflows for both accounts
      const workflowAccount1 = new MockWorkflowExecution(
        "isolation-test",
        "account-1",
        eventBus
      );
      const workflowAccount2 = new MockWorkflowExecution(
        "isolation-test",
        "account-2",
        eventBus
      );

      await Promise.all([
        workflowAccount1.executeWorkflow(["step1", "step2"]),
        workflowAccount2.executeWorkflow(["step1", "step2"]),
      ]);

      // Connect clients and request historical events
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      handleWebSocketConnection(mockWs2, "account-2", eventBus);

      mockWs1.clearMessages();
      mockWs2.clearMessages();

      mockWs1.receiveMessage({
        type: "get_historical",
        data: { runId: "isolation-test", afterSequenceNumber: 0 },
      });

      mockWs2.receiveMessage({
        type: "get_historical",
        data: { runId: "isolation-test", afterSequenceNumber: 0 },
      });

      const account1Historical = mockWs1.getLastMessage();
      const account2Historical = mockWs2.getLastMessage();

      // Each should only see their own account's events
      expect(account1Historical.data.events.length).toBeGreaterThan(0);
      expect(account2Historical.data.events.length).toBeGreaterThan(0);

      account1Historical.data.events.forEach((event: any) => {
        expect(event.accountId).toBe("account-1");
      });

      account2Historical.data.events.forEach((event: any) => {
        expect(event.accountId).toBe("account-2");
      });

      // Subscribe with historical replay
      mockWs1.clearMessages();
      mockWs2.clearMessages();

      const account1LastSeq = Math.max(
        ...account1Historical.data.events.map((e: any) => e.sequenceNumber)
      );
      const account2LastSeq = Math.max(
        ...account2Historical.data.events.map((e: any) => e.sequenceNumber)
      );

      mockWs1.receiveMessage({
        type: "subscribe",
        data: {
          runId: "isolation-test",
          lastReceivedSequenceNumber: account1LastSeq - 2, // Request some replay
        },
      });

      mockWs2.receiveMessage({
        type: "subscribe",
        data: {
          runId: "isolation-test",
          lastReceivedSequenceNumber: account2LastSeq - 2, // Request some replay
        },
      });

      // Each should only receive their own account's replay events
      const account1Replay = mockWs1.getAllMessages().slice(1); // Skip subscription confirmation
      const account2Replay = mockWs2.getAllMessages().slice(1); // Skip subscription confirmation

      account1Replay.forEach((msg) => {
        expect(msg.data.accountId).toBe("account-1");
      });

      account2Replay.forEach((msg) => {
        expect(msg.data.accountId).toBe("account-2");
      });
    });
  });

  describe("Performance and Stress Testing", () => {
    test("should handle high-frequency event emission", async () => {
      handleWebSocketConnection(mockWs1, "account-1", eventBus);
      mockWs1.clearMessages();

      mockWs1.receiveMessage({
        type: "subscribe",
        data: { runId: "high-frequency-test" },
      });

      mockWs1.clearMessages();

      // Emit many events rapidly
      const workflow = new MockWorkflowExecution(
        "high-frequency-test",
        "account-1",
        eventBus
      );
      const steps = Array.from({ length: 50 }, (_, i) => `step-${i}`);

      await workflow.executeWorkflow(steps);

      const messages = mockWs1.getAllMessages();

      // Should receive all events (50 steps × 2 events + 25 conditions = 125 events)
      expect(messages).toHaveLength(125);

      // Verify sequence numbers are consecutive
      for (let i = 0; i < messages.length; i++) {
        expect(messages[i].data.sequenceNumber).toBe(i + 1);
      }

      // Verify all events are for the correct run and account
      messages.forEach((msg) => {
        expect(msg.data.runId).toBe("high-frequency-test");
        expect(msg.data.accountId).toBe("account-1");
      });
    });

    test("should handle multiple concurrent clients", async () => {
      const numClients = 10;
      const clients: MockWebSocket[] = [];

      // Connect multiple clients
      for (let i = 0; i < numClients; i++) {
        const client = new MockWebSocket();
        clients.push(client);
        handleWebSocketConnection(client, "account-1");
        client.clearMessages();

        client.receiveMessage({
          type: "subscribe",
          data: { runId: "multi-client-test" },
        });

        client.clearMessages();
      }

      // Execute workflow
      const workflow = new MockWorkflowExecution(
        "multi-client-test",
        "account-1",
        eventBus
      );
      await workflow.executeWorkflow(["step1", "step2", "step3"]);

      // All clients should receive the same events
      const expectedEventCount = 8; // 3 steps × 2 + 2 conditions

      clients.forEach((client, index) => {
        const messages = client.getAllMessages();
        expect(messages).toHaveLength(expectedEventCount);

        // Verify sequence numbers
        messages.forEach((msg, msgIndex) => {
          expect(msg.data.sequenceNumber).toBe(msgIndex + 1);
        });
      });

      // Verify all clients received identical events
      const firstClientMessages = clients[0].getAllMessages();
      clients.slice(1).forEach((client) => {
        const clientMessages = client.getAllMessages();
        expect(clientMessages).toEqual(firstClientMessages);
      });
    });
  });
});
